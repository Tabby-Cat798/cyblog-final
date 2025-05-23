import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { revalidateFrontend } from '@/lib/revalidate';

export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    console.log('收到文章数据:', body);
    
    // 验证必填字段
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }
    
    // 获取北京时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // 准备文章数据
    const article = {
      title: body.title,
      summary: body.summary || '',
      tags: body.tags || [],
      content: body.content,
      viewCount: body.viewCount || 0,
      status: body.status || 'published',
      type: body.type || 'technology',
      createdAt: beijingTime,
      coverImage: body.coverImage || ''
    };
    
    console.log('准备保存文章:', article);
    
    // 连接到MongoDB
    const client = await clientPromise;
    console.log('MongoDB连接成功');
    
    const db = client.db('blogs');
    console.log('已选择数据库: blogs');
    
    // 插入文章
    const result = await db.collection('articles').insertOne(article);
    console.log('文章插入成功:', result);
    
    // 重新验证首页
    await revalidateFrontend({ 
      path: '/',
      postId: null 
    });
    
    // 重新验证文章列表页
    await revalidateFrontend({ 
      path: '/posts',
      postId: null 
    });

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '文章发布成功',
      articleId: result.insertedId
    }, { status: 201 });
    
  } catch (error) {
    console.error('发布文章失败:', error);
    return NextResponse.json(
      { error: '发布文章失败', message: error.message },
      { status: 500 }
    );
  }
}

// 获取所有文章
export async function GET(request) {
  try {
    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status'); // published, draft, 或 null
    const tag = searchParams.get('tag');
    
    console.log('文章查询参数:', { limit, status, tag });
    
    // 连接到MongoDB
    const client = await clientPromise;
    const db = client.db('blogs');
    
    // 构建查询条件
    const query = {};
    
    // 如果指定了状态，添加状态过滤
    if (status) {
      query.status = status;
    }
    
    // 如果指定了标签，添加标签过滤
    if (tag) {
      query.tags = tag;
    }
    
    console.log('文章查询条件:', query);
    
    // 获取所有文章，按创建时间降序排序
    const articles = await db
      .collection('articles')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    console.log(`查询到 ${articles.length} 篇文章`);
    
    // 返回文章列表
    return NextResponse.json({
      articles,
      total: articles.length
    });
    
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败', message: error.message },
      { status: 500 }
    );
  }
} 