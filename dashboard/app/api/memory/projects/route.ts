import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProjects, createProject } from '@/lib/db/memory';
import type { ProjectStatus } from '@/lib/types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ProjectStatus | null;
  const projects = await getProjects(supabase, user.id, { status: status ?? undefined });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const project = await createProject(supabase, user.id, body);
  return NextResponse.json(project, { status: 201 });
}
