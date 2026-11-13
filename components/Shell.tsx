'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  Users,
  UsersRound,
  X,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getUser, logout } from '@/lib/api';
import { menus } from '@/lib/config';

const icons: Record<string, LucideIcon> = {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Lock,
  MapPinned,
  Users,
  UsersRound,
};

type Role = 'admin' | 'guru' | 'siswa';

export default function Shell({ role, children, title }: { role: Role; children: React.ReactNode; title: string }) {
  const path = usePathname();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    if (!localStorage.getItem('simmas_token')) location.href = '/login';
  }, []);

  const name = user?.namalengkap || user?.nama || user?.name || user?.email || role;
  const passwordUrl = role === 'admin' ? '/admin/password' : role === 'siswa' ? '/siswa/password' : null;
  let activeGroup = '';

  return (
    <div className="min-h-screen">
      {open && <button aria-label="Tutup menu" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-100 bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white">S</div>
          <div>
            <div className="font-bold tracking-tight text-slate-800">SIMMAS</div>
            <div className="text-[9px] tracking-[.14em] text-slate-400">SISTEM INFORMASI MAGANG</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-5">
          {menus[role].map(([label, url, iconName, group]: [string, string, string, string]) => {
            const Icon = icons[iconName] || LayoutDashboard;
            const active = path === url || path.startsWith(`${url}/`);
            const showGroup = group !== activeGroup;
            activeGroup = group;
            return (
              <div key={url}>
                {showGroup && <div className="px-2 pb-2 pt-4 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">{group}</div>}
                <Link
                  href={url}
                  onClick={() => setOpen(false)}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
                >
                  <Icon size={16} />{label}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="m-4 rounded-xl bg-blue-50 p-4">
          <div className="text-xs font-semibold text-blue-900">SIMMAS Portal</div>
          <p className="mt-1 text-[11px] leading-5 text-blue-700">Sistem monitoring praktik kerja lapangan.</p>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-100 bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu size={20} /></button>
            <div>
              <div className="text-[10px] text-slate-400">SIMMAS / {role.toUpperCase()}</div>
              <h1 className="text-sm font-bold text-slate-800">{title}</h1>
            </div>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{String(name).charAt(0).toUpperCase()}</div>
              <span className="hidden text-left sm:block">
                <span className="block text-[11px] font-semibold text-slate-700">{name}</span>
                <span className="block text-[9px] capitalize text-slate-400">{role}</span>
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
                {passwordUrl && <Link href={passwordUrl} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-blue-50"><Settings size={15} /> Ganti password</Link>}
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Keluar</button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] p-4 md:p-6">
          {children}
          <footer className="mt-10 border-t border-slate-200 py-5 text-center text-[11px] text-slate-400">© {new Date().getFullYear()} SIMMAS · Sistem Informasi Manajemen Magang</footer>
        </main>
      </div>
    </div>
  );
}
