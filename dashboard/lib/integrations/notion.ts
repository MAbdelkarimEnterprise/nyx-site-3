const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function notionHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export interface NotionPage {
  id: string;
  title: string;
  type: 'page' | 'database';
  lastEdited: string;
  url: string;
  icon: string | null;
  workspace: string | null;
}

export async function fetchNotionPages(accessToken: string, pageSize = 15): Promise<NotionPage[]> {
  const res = await fetch(`${NOTION_BASE}/search`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: pageSize,
    }),
  });
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, unknown>) => {
    const props = r.properties as Record<string, unknown> | null;
    let title = '(untitled)';

    if (r.object === 'database') {
      const titleField = r.title as { plain_text: string }[] | null;
      title = titleField?.map((t) => t.plain_text).join('') || '(untitled database)';
    } else if (props) {
      const titleProp = (props['title'] ?? props['Name'] ?? props['name']) as
        | { title: { plain_text: string }[] }
        | null;
      const titleArr = titleProp?.title ?? [];
      title = titleArr.map((t) => t.plain_text).join('') || '(untitled)';
    }

    const iconObj = r.icon as { type: string; emoji?: string; external?: { url: string }; file?: { url: string } } | null;
    let icon: string | null = null;
    if (iconObj?.type === 'emoji') icon = iconObj.emoji ?? null;
    else if (iconObj?.type === 'external') icon = iconObj.external?.url ?? null;
    else if (iconObj?.type === 'file') icon = iconObj.file?.url ?? null;

    const parent = r.parent as Record<string, unknown> | null;
    const workspace = parent?.type === 'workspace' ? 'Workspace' : null;

    return {
      id: r.id as string,
      title,
      type: (r.object as 'page' | 'database'),
      lastEdited: r.last_edited_time as string,
      url: r.url as string,
      icon,
      workspace,
    };
  });
}
