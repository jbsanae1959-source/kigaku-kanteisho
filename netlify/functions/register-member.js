// netlify/functions/register-member.js
// Notion APIへの中継サーバー（Netlify Functions）
// 環境変数: NOTION_API_KEY, NOTION_DATABASE_ID

exports.handler = async (event) => {
  // POSTメソッドのみ受け付ける
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // 環境変数を取得
  const NOTION_API_KEY    = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '環境変数が設定されていません（NOTION_API_KEY / NOTION_DATABASE_ID）' }),
    };
  }

  // リクエストボディを解析
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'リクエストの形式が正しくありません' }),
    };
  }

  const { name, birthdate, gender, memo } = body;

  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '氏名は必須です' }),
    };
  }

  // Notion APIに送るデータを組み立てる
  // ※プロパティ名はNotion DB側と完全一致させること
  const notionBody = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      '氏名': {
        title: [{ text: { content: name } }],
      },
      '生年月日': birthdate
        ? { date: { start: birthdate } }
        : { date: null },
      '性別': {
        select: { name: gender || '' },
      },
      'メモ': {
        rich_text: [{ text: { content: memo || '' } }],
      },
    },
  };

  // Notion APIを呼び出す
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(notionBody),
    });

    const result = await response.json();

    if (!response.ok) {
      // Notion側のエラー詳細をそのまま返す
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Notion APIエラー',
          detail: result,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'サーバーエラー', detail: e.message }),
    };
  }
};
