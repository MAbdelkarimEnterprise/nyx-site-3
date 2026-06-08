import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRelationships, createRelationship } from '@/lib/db/memory';
import type { RelationshipType } from '@/lib/types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as RelationshipType | null;
  const relationships = await getRelationships(supabase, user.id, { type: type ?? undefined });
  return NextResponse.json(relationships);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const relationship = await createRelationship(supabase, user.id, body);
  return NextResponse.json(relationship, { status: 201 });
}
