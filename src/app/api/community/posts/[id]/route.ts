import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAnon, createSupabaseServerClient } from "@/lib/supabase/server";
import type { 
  PostDetailResponse,
  UpdatePostRequest 
} from "@/lib/supabase/db-types";

/**
 * 게시글 상세 API Routes
 * 
 * 설계 의도:
 * - GET: 게시글 상세 조회 + 조회수 증가
 * - PATCH: 게시글 수정 (권한 체크 포함)
 * - DELETE: 게시글 삭제 (Soft Delete, 권한 체크 포함)
 * 
 * 보안:
 * - 권한 체크: 관리자는 모든 글, 일반 회원은 본인 글만 수정/삭제 가능
 * - XSS 방지: 수정 시에도 sanitization 적용
 */

/**
 * 권한 검증 함수
 * 
 * @param currentUserId 현재 로그인한 사용자 ID
 * @param currentUserRole 현재 사용자 role (USER/ADMIN)
 * @param postUserId 게시글 작성자 ID
 * @returns 수정/삭제 권한 여부
 * 
 * 규칙:
 * - ADMIN: 모든 글 수정/삭제 가능
 * - USER: 본인 글만 수정/삭제 가능
 */
function canModifyPost(
  currentUserId: string,
  currentUserRole: string,
  postUserId: string
): boolean {
  // 관리자는 모든 글 수정/삭제 가능
  if (currentUserRole === 'ADMIN') {
    return true;
  }
  
  // 일반 회원은 본인 글만 수정/삭제 가능
  return currentUserId === postUserId;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// =========================================
// GET /api/community/posts/[id] - 게시글 상세 조회
// =========================================
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAnon();

    // 게시글 조회
    const { data: post, error } = await supabase
      .from('board_posts')
      .select('*')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found.' },
        { status: 404 }
      );
    }

    // 조회수 증가 (비동기, 에러 무시)
    (async () => {
      try {
        await supabase
          .from('board_posts')
          .update({ view_count: post.view_count + 1 })
          .eq('post_id', postId);
      } catch (err) {
        console.error('Failed to increment view count:', err);
      }
    })();

    const response: PostDetailResponse = post;

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/community/posts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// =========================================
// PATCH /api/community/posts/[id] - 게시글 수정
// =========================================
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID.' },
        { status: 400 }
      );
    }

    // 1. 현재 로그인한 사용자 확인
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { session } } = await supabaseAuth.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdatePostRequest;
    const { title, content, category } = body;

    // 최소 하나의 필드는 수정되어야 함
    if (!title && !content && !category) {
      return NextResponse.json(
        { error: 'At least one field (title, content, category) is required.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAnon();

    // 2. 현재 사용자 정보 조회 (role 확인)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('user_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    // 3. 기존 게시글 확인 (user_id 포함)
    const { data: existingPost, error: fetchError } = await supabase
      .from('board_posts')
      .select('post_id, user_id, board_type, deleted_at')
      .eq('post_id', postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found.' },
        { status: 404 }
      );
    }

    if (existingPost.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot update deleted post.' },
        { status: 400 }
      );
    }

    // 4. 권한 검증: 관리자 또는 본인만 수정 가능
    if (!canModifyPost(currentUser.user_id, currentUser.role, existingPost.user_id)) {
      return NextResponse.json(
        { error: '이 게시글을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: Partial<{
      title: string;
      content: string;
      category: 'free' | 'suggestion' | null;
    }> = {};

    if (title) {
      if (title.length > 300) {
        return NextResponse.json(
          { error: 'Title must be less than 300 characters.' },
          { status: 400 }
        );
      }
      updateData.title = title.replace(/<[^>]*>/g, '').trim();
    }

    if (content) {
      updateData.content = content.replace(/<script[^>]*>.*?<\/script>/gi, '').trim();
    }

    if (category) {
      // 자유게시판만 카테고리 변경 가능
      if (existingPost.board_type !== 'free') {
        return NextResponse.json(
          { error: 'Category can only be set for free board.' },
          { status: 400 }
        );
      }
      if (!['free', 'suggestion'].includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category.' },
          { status: 400 }
        );
      }
      updateData.category = category;
    }

    // 게시글 업데이트
    const { data, error: updateError } = await supabase
      .from('board_posts')
      .update(updateData)
      .eq('post_id', postId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update post:', updateError);
      return NextResponse.json(
        { error: 'Failed to update post.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        post: data 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in PATCH /api/community/posts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// =========================================
// DELETE /api/community/posts/[id] - 게시글 삭제 (Soft Delete)
// =========================================
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID.' },
        { status: 400 }
      );
    }

    // 1. 현재 로그인한 사용자 확인
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { session } } = await supabaseAuth.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAnon();

    // 2. 현재 사용자 정보 조회 (role 확인)
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('user_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    // 3. 기존 게시글 확인 (user_id 포함)
    const { data: existingPost, error: fetchError } = await supabase
      .from('board_posts')
      .select('post_id, user_id, deleted_at')
      .eq('post_id', postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found.' },
        { status: 404 }
      );
    }

    if (existingPost.deleted_at) {
      return NextResponse.json(
        { error: 'Post already deleted.' },
        { status: 400 }
      );
    }

    // 4. 권한 검증: 관리자 또는 본인만 삭제 가능
    if (!canModifyPost(currentUser.user_id, currentUser.role, existingPost.user_id)) {
      return NextResponse.json(
        { error: '이 게시글을 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Soft Delete (deleted_at 설정)
    const { error: deleteError } = await supabase
      .from('board_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('post_id', postId);

    if (deleteError) {
      console.error('Failed to delete post:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete post.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Post deleted successfully.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in DELETE /api/community/posts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
