import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { listAllUsers } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, PointsBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'ユーザー管理' };

export default async function AdminUsersPage() {
  const users = await listAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">ユーザー管理</h1>
        <p className="mt-1 text-sm text-slate-600">全 {users.length} 名</p>
      </div>

      {users.length === 0 ? (
        <EmptyState title="まだユーザーがいません" />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Link key={user.id} href={`/admin/users/${user.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-slate-900">{user.fullName || '(未登録)'}</p>
                      {user.role === 'admin' && (
                        <Badge className="bg-brand-100 text-brand-800 ring-brand-200">
                          <ShieldCheck className="size-3.5" aria-hidden />
                          管理者
                        </Badge>
                      )}
                      {!user.isActive && (
                        <Badge className="bg-rose-100 text-rose-800 ring-rose-200">無効化済み</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <PointsBadge points={user.points} />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
