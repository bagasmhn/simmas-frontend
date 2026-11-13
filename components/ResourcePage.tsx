'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  dataOf,
  getUser,
  json,
  label,
  rowsOf,
} from '@/lib/api';
import {
  Camera,
  Check,
  Eye,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type Row = Record<string, any>;
type Field = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'date' | 'number' | 'textarea' | 'file' | 'select';
  required?: boolean;
  options?: string[];
};
type PageConfig = {
  path?: string;
  createPath?: string;
  filters?: string[];
  fields?: Field[];
  editFields?: Field[];
  actions?: string[];
  kind?: 'dashboard' | 'application' | 'password' | 'attendance' | 'monitoring' | 'placement' | 'audit' | 'journal-attendance';
};

const companyFields: Field[] = [
  { name: 'nama_perusahaan', label: 'Nama Perusahaan', required: true },
  { name: 'alamat', label: 'Alamat', required: true },
  { name: 'bidang_usaha', label: 'Bidang Usaha', required: true },
  { name: 'kuota_peserta', label: 'Kuota Peserta Tersedia', type: 'select', options: ['true', 'false'], required: true },
  { name: 'penanggung_jawab', label: 'Penanggung Jawab', required: true },
  { name: 'kontak', label: 'Kontak', required: true },
];

const configs: Record<string, PageConfig> = {
  'admin:dashboard': { kind: 'dashboard' },
  'admin:monitoring-global': { kind: 'monitoring' },
  'admin:monitoring-siswa': { path: '/admin/monitoring/siswa', filters: ['kelas'] },
  'admin:monitoring-kunjungan': { path: '/admin/monitoring/kunjungan' },
  'admin:pengajuan-magang': { path: '/admin/pengajuan-magang', actions: ['approve', 'reject'] },
  'admin:siswa': {
    path: '/admin/siswa',
    createPath: '/admin/siswa',
    filters: ['kelas', 'dudiId', 'status'],
    fields: [
      { name: 'nama', label: 'Nama Lengkap', required: true },
      { name: 'nis', label: 'NIS', required: true },
      { name: 'kelas', label: 'Kelas', required: true },
    ],
    editFields: [
      { name: 'namalengkap', label: 'Nama Lengkap' },
      { name: 'nis', label: 'NIS' },
      { name: 'kelas', label: 'Kelas' },
    ],
    actions: ['edit', 'delete', 'status'],
  },
  'admin:guru': {
    path: '/admin/guru',
    createPath: '/admin/guru',
    filters: ['jurusan', 'status'],
    fields: [
      { name: 'namalengkap', label: 'Nama Lengkap', required: true },
      { name: 'nip', label: 'NIP', required: true },
      { name: 'jurusan', label: 'Jurusan', type: 'select', options: ['RPL', 'TKJ', 'MM'], required: true },
    ],
    editFields: [
      { name: 'namalengkap', label: 'Nama Lengkap' },
      { name: 'nip', label: 'NIP' },
      { name: 'jurusan', label: 'Jurusan', type: 'select', options: ['RPL', 'TKJ', 'MM'] },
    ],
    actions: ['edit', 'delete', 'status'],
  },
  'admin:mitra': {
    path: '/admin/mitra',
    createPath: '/admin/perusahaan',
    filters: ['status'],
    fields: companyFields,
    actions: ['edit', 'delete', 'verify'],
  },
  'admin:penempatan': { kind: 'placement' },
  'admin:penempatan-data': {
    path: '/admin/penempatan',
    filters: ['kelas', 'dudiId', 'status'],
    fields: [
      { name: 'dudiId', label: 'ID Perusahaan', type: 'number', required: true },
      { name: 'guruPembimbingId', label: 'ID Guru Pembimbing', type: 'number', required: true },
      { name: 'posisi', label: 'Posisi', required: true },
    ],
    actions: ['edit', 'delete', 'status'],
  },
  'guru:dashboard': { kind: 'dashboard' },
  'guru:siswa': { path: '/guru/siswa', actions: ['grade', 'detail'] },
  'guru:dudi-bimbingan': { path: '/guru/dudi-bimbingan' },
  'guru:jurnal': { path: '/guru/jurnal', actions: ['journal'] },
  'guru:jurnal-absensi': { kind: 'journal-attendance' },
  'guru:kunjungan': {
    path: '/guru/kunjungan',
    createPath: '/guru/kunjungan',
    fields: [
      { name: 'dudiId', label: 'ID Perusahaan', type: 'number', required: true },
      { name: 'tanggalKunjungan', label: 'Tanggal Kunjungan', type: 'date', required: true },
      { name: 'catatanEvaluasi', label: 'Catatan Evaluasi', type: 'textarea', required: true },
      { name: 'foto', label: 'Foto Dokumentasi', type: 'file' },
    ],
  },
  'siswa:dashboard': { kind: 'dashboard' },
  'siswa:pengajuan-magang': { kind: 'application' },
  'siswa:absensi': { kind: 'attendance' },
  'siswa:jurnal': {
    path: '/siswa/jurnal',
    createPath: '/siswa/jurnal',
    fields: [
      { name: 'tanggalPelaksana', label: 'Tanggal Pelaksanaan', type: 'date', required: true },
      { name: 'rincianKegiatan', label: 'Rincian Kegiatan', type: 'textarea', required: true },
      { name: 'kendalaMasalah', label: 'Kendala / Masalah', type: 'textarea' },
      { name: 'tindakLanjut', label: 'Tindak Lanjut', type: 'textarea' },
      { name: 'foto', label: 'Foto Kegiatan', type: 'file' },
    ],
    actions: ['edit', 'delete'],
  },
  'siswa:perusahaan': {
    createPath: '/siswa/admin/perusahaan',
    fields: companyFields,
  },
  'admin:password': { kind: 'password' },
  'admin:audit': { kind: 'audit' },
  'siswa:password': { kind: 'password' },
  'guru:password': { kind: 'password' },
};

const statusChoices: Record<string, string[]> = {
  guru: ['AKTIF', 'NONAKTIF'],
  siswa: ['BELUM_MAGANG', 'SEDANG_MAGANG', 'LULUS'],
  mitra: ['TERVERIFIKASI', 'MENUNGGU_VALIDASI'],
  penempatan: ['SEDANG_MAGANG', 'LULUS'],
  'penempatan-data': ['SEDANG_MAGANG', 'LULUS'],
};

const preferredColumns: Record<string, string[]> = {
  'admin:monitoring-siswa': ['nama', 'kelas', 'dudi', 'pembimbing', 'kehadiran', 'jumlah_jurnal', 'status'],
  'admin:monitoring-kunjungan': ['tanggal', 'guru_pembimbing', 'tempat_magang', 'catatan_kunjungan'],
  'admin:siswa': ['nama', 'nis', 'kelas', 'status'],
  'admin:guru': ['namalengkap', 'nip', 'jurusan', 'status'],
  'admin:mitra': ['nama_perusahaan', 'bidang_usaha', 'alamat', 'kontak', 'status'],
  'admin:penempatan-data': ['siswa', 'dudi', 'guruPembimbing', 'posisi', 'status'],
  'guru:siswa': ['siswa', 'penempatan'],
  'guru:dudi-bimbingan': ['nama_perusahaan', 'bidang_usaha', 'alamat', 'kontak'],
  'guru:jurnal': ['tanggalPelaksana', 'siswa', 'rincianKegiatan', 'status'],
  'guru:kunjungan': ['tanggalKunjungan', 'dudi', 'catatanEvaluasi'],
  'siswa:jurnal': ['tanggalPelaksana', 'rincianKegiatan', 'status'],
};

function titleCase(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function idOf(item: Row) {
  const id = item.id ?? item.ID ?? item.siswa?.id;
  return id === null || id === undefined ? '' : String(id);
}

function cellValue(item: Row, key: string) {
  if (key === 'status' && item.siswa?.status) return item.siswa.status;
  const value = item[key];
  if (key === 'kehadiran' && value && typeof value === 'object') return value.format || JSON.stringify(value);
  if (key === 'siswa' && value && typeof value === 'object') return value.nama || value.namalengkap || value.nis || '-';
  if (key === 'penempatan' && value && typeof value === 'object') return [value.dudi?.nama_perusahaan, value.posisi].filter(Boolean).join(' · ') || '-';
  if (['dudi', 'guruPembimbing', 'guru_pembimbing'].includes(key) && value && typeof value === 'object') {
    return value.nama_perusahaan || value.namalengkap || value.nama || value.name || '-';
  }
  if (['tanggal', 'tanggalPelaksana', 'tanggalKunjungan'].includes(key) && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
  }
  return value;
}

function findRows(value: any, keys: string[]): Row[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  for (const key of ['data', 'result', 'dashboard']) {
    if (value[key] && typeof value[key] === 'object') {
      const found = findRows(value[key], keys);
      if (found.length) return found;
    }
  }
  return [];
}

function toInputDate(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 10);
}

export default function ResourcePage({ role, section }: { role: string; section: string }) {
  const cfg = configs[`${role}:${section}`] || {};
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Row | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dudiOptions, setDudiOptions] = useState<Row[]>([]);

  const fields = edit ? cfg.editFields || cfg.fields || [] : cfg.fields || [];
  const cols = useMemo(() => {
    const keys = Array.from(new Set(data.slice(0, 8).flatMap(item => Object.keys(item || {}))));
    const visible = keys.filter(key => !['id', 'password', 'updatedat', 'createdat', 'role', 'fotoUrl'].includes(key.toLowerCase()));
    const preferred = preferredColumns[`${role}:${section}`] || [];
    return [...preferred.filter(key => visible.includes(key)), ...visible.filter(key => !preferred.includes(key))].slice(0, 7);
  }, [data, role, section]);

  const load = useCallback(async () => {
    if (!cfg.path) return;
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const suffix = params.toString();
      const result = await api(`${cfg.path}${suffix ? `?${suffix}` : ''}`);
      setData(rowsOf(result));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [cfg.path, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role !== 'guru' || section !== 'kunjungan') return;
    api('/guru/dudi-bimbingan')
      .then(result => setDudiOptions(rowsOf(result)))
      .catch(error => setErr(error instanceof Error ? error.message : 'Gagal memuat DUDI bimbingan.'));
  }, [role, section]);

  function openForm(item: Row | null = null) {
    setEdit(item);
    const initial: Row = {};
    (item ? cfg.editFields || cfg.fields || [] : cfg.fields || []).forEach(field => {
      initial[field.name] = field.type === 'date'
        ? toInputDate(item?.[field.name])
        : item?.[field.name] ?? (field.name === 'namalengkap' ? item?.nama : '');
    });
    setForm(initial);
    setErr('');
    setNotice('');
    setModal(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = edit ? `${cfg.path}/${idOf(edit)}` : cfg.createPath;
    if (!path || (edit && !idOf(edit))) {
      setErr('ID atau endpoint data tidak ditemukan.');
      return;
    }
    setErr('');
    try {
      const isMultipart = fields.some(field => field.type === 'file');
      if (isMultipart) {
        const body = new FormData();
        fields.forEach(field => {
          const value = form[field.name];
          if (field.type === 'file') {
            if (value) body.append(field.name, value);
          } else if (edit || (value !== '' && value !== null && value !== undefined)) {
            body.append(field.name, String(value ?? ''));
          }
        });
        await api(path, { method: edit ? 'PATCH' : 'POST', body });
      } else {
        const body: Row = {};
        fields.forEach(field => {
          const value = form[field.name];
          if (value === '' || value === null || value === undefined) return;
          if (['dudiId', 'guruPembimbingId'].includes(field.name)) {
            body[field.name] = Number(value);
          } else if (field.name === 'kuota_peserta') {
            body[field.name] = value === true || value === 'true';
          } else {
            body[field.name] = value;
          }
        });
        const response = await api(path, json(edit ? 'PATCH' : 'POST', body));
        const userEmail = response?.data?.email;
        const message = response?.message || 'Data berhasil disimpan.';
        setModal(false);
        setNotice(userEmail && !edit ? `${message}. Email akun: ${userEmail}` : message);
        await load();
        return;
      }
      setModal(false);
      setNotice('Data berhasil disimpan.');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal menyimpan data.');
    }
  }

  async function action(item: Row, actionName: string) {
    const id = idOf(item);
    if (!id) {
      setErr('ID data tidak ditemukan.');
      return;
    }
    setErr('');
    setNotice('');
    try {
      if (actionName === 'delete') {
        if (!window.confirm('Yakin ingin menghapus data ini?')) return;
        await api(`${cfg.path}/${id}`, { method: 'DELETE' });
      } else if (actionName === 'approve' || actionName === 'reject') {
        const body: Row = { status: actionName === 'approve' ? 'DISETUJUI' : 'DITOLAK' };
        if (actionName === 'approve') {
          const teacherId = window.prompt('Masukkan ID guru pembimbing aktif (wajib):');
          if (teacherId === null) return;
          if (!/^\d+$/.test(teacherId.trim())) throw new Error('ID guru pembimbing aktif wajib berupa angka.');
          body.guruPembimbingId = Number(teacherId);
        }
        await api(`/admin/pengajuan-magang/${id}/status`, json('PATCH', body));
      } else if (actionName === 'verify') {
        await api(`/admin/mitra/${id}/verifikasi`, { method: 'PATCH' });
      } else if (actionName === 'status') {
        const endpoint = role === 'admin' && section === 'guru'
          ? `/admin/guru/${id}/status`
          : role === 'admin' && section === 'siswa'
            ? `/admin/siswa/${id}/status`
            : `/admin/penempatan/${id}/status`;
        const choices = statusChoices[section] || [];
        const value = window.prompt(`Status baru (${choices.join(' / ')}):`, choices[0]);
        if (value === null) return;
        if (!choices.includes(value.trim())) {
          throw new Error(`Status harus salah satu dari: ${choices.join(', ')}.`);
        }
        await api(endpoint, json('PATCH', { status: value.trim() }));
      } else if (actionName === 'grade') {
        const rawScore = window.prompt('Masukkan nilai PKL (0–100):');
        if (rawScore === null) return;
        if (!rawScore.trim()) throw new Error('Nilai PKL wajib diisi.');
        const nilai = Number(rawScore);
        if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) {
          throw new Error('Nilai PKL harus berupa angka dari 0 sampai 100.');
        }
        const catatan = window.prompt('Catatan penilaian (opsional):') || '';
        await api(`/guru/siswa/${id}/nilai`, json('POST', { nilai, catatan }));
      } else if (actionName === 'journal') {
        const value = window.prompt('Keputusan jurnal (REVISI atau DISETUJUI_GURU):');
        if (value === null) return;
        if (!['REVISI', 'DISETUJUI_GURU'].includes(value.trim())) {
          throw new Error('Keputusan harus REVISI atau DISETUJUI_GURU.');
        }
        const catatanGuru = window.prompt('Catatan guru (opsional):') || '';
        await api(`/guru/jurnal/${id}/keputusan`, json('PATCH', { status: value.trim(), catatanGuru }));
      } else if (actionName === 'detail' && role === 'guru' && section === 'siswa') {
        setDetailLoading(true);
        try {
          setDetail(dataOf(await api(`/guru/siswa/${id}`)));
        } finally {
          setDetailLoading(false);
        }
        return;
      } else if (actionName === 'detail') {
        setDetail(item);
        return;
      }
      setNotice('Aksi berhasil diproses.');
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Aksi gagal diproses.');
    }
  }

  if (cfg.kind === 'dashboard') return <Dashboard role={role} />;
  if (cfg.kind === 'monitoring') return <AdminMonitoringPage />;
  if (cfg.kind === 'placement') return <AdminPlacementsPage />;
  if (cfg.kind === 'journal-attendance') return <GuruJournalAttendancePage />;
  if (cfg.kind === 'audit') return <AuditUnavailablePage />;
  if (cfg.kind === 'application') return <StudentApplication />;
  if (cfg.kind === 'attendance') return <AttendancePage />;
  if (cfg.kind === 'password') {
    return role === 'guru'
      ? <div className="card max-w-xl p-6"><h2 className="font-bold">Fitur belum tersedia</h2><p className="mt-2 text-sm text-slate-500">Endpoint ganti password untuk role Guru belum tercantum pada dokumentasi API.</p></div>
      : <PasswordPage role={role} />;
  }

  const filtered = data.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  const activeCount = data.filter(item => ['AKTIF', 'SEDANG_MAGANG', 'TERVERIFIKASI', 'DISETUJUI'].includes(String(item.status || '').toUpperCase())).length;
  const pendingCount = data.filter(item => /MENUNGGU|DITINJAU|VALIDASI/i.test(String(item.status || ''))).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-500">Kelola dan pantau data {section.replaceAll('-', ' ')}.</p>
          <p className="mt-1 text-[11px] text-slate-400">Data dimuat langsung dari API SIMMAS.</p>
        </div>
        <div className="flex gap-2">
          {cfg.createPath && <button onClick={() => openForm()} className="btn btn-primary"><Plus size={16} /> Tambah Data</button>}
          {cfg.path && <button onClick={load} className="btn btn-light"><RefreshCw size={15} /> Refresh</button>}
        </div>
      </div>

      {cfg.path && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Data" value={data.length} detail="Data tersedia" />
          <MetricCard title="Status Aktif" value={activeCount} detail="Data aktif / berjalan" tone="green" />
          <MetricCard title="Perlu Perhatian" value={pendingCount} detail="Menunggu tindak lanjut" tone="amber" />
          <MetricCard title="Hasil Ditampilkan" value={filtered.length} detail={query ? 'Sesuai pencarian' : 'Setelah filter'} tone="purple" />
        </div>
      )}

      {cfg.filters?.length ? (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex items-center gap-2 pb-2 text-xs font-semibold text-slate-600"><Filter size={15} /> Filter</div>
          {cfg.filters.map(key => (
            <label key={key} className="min-w-40 flex-1 text-[11px] font-semibold text-slate-500">
              {titleCase(key)}
              {key === 'status' || key === 'jurusan' ? (
                <select className="input mt-1" value={filters[key] || ''} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>
                  <option value="">Semua</option>
                  {(key === 'jurusan' ? ['RPL', 'TKJ', 'MM'] : statusChoices[section] || ['BELUM_MAGANG', 'SEDANG_MAGANG', 'LULUS']).map(value => <option key={value}>{value}</option>)}
                </select>
              ) : (
                <input className="input mt-1" placeholder={`Cari ${titleCase(key)}`} value={filters[key] || ''} onChange={event => setFilters({ ...filters, [key]: event.target.value })} />
              )}
            </label>
          ))}
          <button className="btn btn-light" onClick={() => setFilters({})}>Reset</button>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Daftar {titleCase(section)}</h2>
            <p className="mt-1 text-[11px] text-slate-400">{filtered.length} data ditemukan</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input className="input pl-9" placeholder="Cari data..." value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>
        <Feedback err={err} notice={notice} />
        {loading ? <div className="p-12 text-center text-sm text-slate-400">Memuat data...</div> : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400"><Search /></div>
            <p className="text-sm font-semibold text-slate-600">Belum ada data</p>
            <p className="mt-1 text-xs text-slate-400">Data belum tersedia atau endpoint mengembalikan hasil kosong.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>{cols.map(key => <th key={key} className="px-5 py-4 font-semibold">{titleCase(key)}</th>)}<th className="px-5 py-4 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, index) => (
                  <tr key={idOf(item) || index} className="hover:bg-slate-50/70">
                    {cols.map(key => (
                      <td key={key} className="max-w-56 truncate px-5 py-4 text-slate-600">
                        {key.toLowerCase().includes('status')
                          ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{label(cellValue(item, key))}</span>
                          : label(cellValue(item, key))}
                      </td>
                    ))}
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {cfg.actions?.includes('approve') && <><ActionButton title="Setujui" onClick={() => action(item, 'approve')} color="text-emerald-600"><Check size={15} /></ActionButton><ActionButton title="Tolak" onClick={() => action(item, 'reject')} color="text-rose-600"><X size={15} /></ActionButton></>}
                        {cfg.actions?.includes('edit') && <ActionButton title="Edit" onClick={() => openForm(item)} color="text-blue-600"><Pencil size={15} /></ActionButton>}
                        {cfg.actions?.includes('status') && <ActionButton title="Ubah status" onClick={() => action(item, 'status')} color="text-amber-600"><RefreshCw size={15} /></ActionButton>}
                        {cfg.actions?.includes('verify') && <ActionButton title="Verifikasi" onClick={() => action(item, 'verify')} color="text-emerald-600"><Check size={15} /></ActionButton>}
                        {cfg.actions?.includes('grade') && <ActionButton title="Beri nilai PKL" onClick={() => action(item, 'grade')} color="text-emerald-600"><Check size={15} /></ActionButton>}
                        {cfg.actions?.includes('journal') && <ActionButton title="Keputusan jurnal" onClick={() => action(item, 'journal')} color="text-blue-600"><Check size={15} /></ActionButton>}
                        {cfg.actions?.includes('delete') && <ActionButton title="Hapus" onClick={() => action(item, 'delete')} color="text-rose-600"><Trash2 size={15} /></ActionButton>}
                        <ActionButton title="Detail" onClick={() => action(item, 'detail')} color="text-slate-400"><Eye size={15} /></ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={`${edit ? 'Edit' : 'Tambah'} ${titleCase(section)}`} onClose={() => setModal(false)}>
          <form onSubmit={save} className="mt-5 space-y-4">
            {fields.map(field => field.name === 'dudiId' && role === 'guru' && section === 'kunjungan' ? (
              <label key={field.name} className="block text-xs font-semibold text-slate-600">Perusahaan Mitra
                <select className="input mt-2" required value={form.dudiId || ''} onChange={event => setForm({ ...form, dudiId: event.target.value })}>
                  <option value="">Pilih DUDI bimbingan</option>
                  {dudiOptions.map(option => <option key={option.id} value={option.id}>{option.nama_perusahaan}</option>)}
                </select>
                {!dudiOptions.length && <span className="mt-1 block font-normal text-slate-400">Tidak ada DUDI dari siswa bimbingan Anda.</span>}
              </label>
            ) : <FormField key={field.name} field={field} value={form[field.name]} onChange={value => setForm({ ...form, [field.name]: value })} isEdit={Boolean(edit)} />)}
            {!edit && role === 'admin' && ['guru', 'siswa'].includes(section) && <p className="rounded-lg bg-blue-50 p-3 text-[11px] leading-5 text-blue-700">Email sekolah dibuat otomatis berdasarkan nama. Password awal mengikuti konfigurasi akun backend.</p>}
            <Feedback err={err} notice="" />
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className="btn btn-light" onClick={() => setModal(false)}>Batal</button>
              <button className="btn btn-primary"><Save size={15} /> Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title="Detail Data" onClose={() => setDetail(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(detail).filter(([key]) => !key.toLowerCase().includes('password')).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] uppercase text-slate-400">{titleCase(key)}</div>
                <div className="mt-1 break-words text-xs font-medium text-slate-700">{label(value)}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {detailLoading && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 text-sm font-medium text-white">Memuat detail siswa...</div>}
    </div>
  );
}

function ActionButton({ title, onClick, color, children }: { title: string; onClick: () => void; color: string; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className={`rounded-lg p-2 ${color} hover:bg-slate-100`}>{children}</button>;
}

function FormField({ field, value, onChange, isEdit = false }: { field: Field; value: any; onChange: (value: any) => void; isEdit?: boolean }) {
  const required = field.required && !(isEdit && field.type === 'password');
  if (field.type === 'select') {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {field.label}
        <select className="input mt-2" required={required} value={String(value ?? '')} onChange={event => onChange(event.target.value)}>
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {(field.options || []).map(option => <option key={option} value={option}>{field.name === 'kuota_peserta' ? option === 'true' ? 'Tersedia' : 'Penuh' : option}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'file') {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {field.label}
        <input className="input mt-2" type="file" accept="image/*" capture="environment" required={required} onChange={event => onChange(event.target.files?.[0] || null)} />
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {field.label}
        <textarea className="input mt-2 min-h-24" required={required} value={value || ''} onChange={event => onChange(event.target.value)} />
      </label>
    );
  }
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {field.label}
      <input
        className="input mt-2"
        type={field.type || 'text'}
        required={required}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Feedback({ err, notice }: { err: string; notice: string }) {
  return (
    <>
      {err && <div className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{err}</div>}
      {notice && <div className="m-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
    </>
  );
}

function MetricCard({ title, value, detail, tone = 'blue' }: { title: string; value: React.ReactNode; detail: string; tone?: 'blue' | 'green' | 'amber' | 'purple' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tones[tone]}`}><span className="h-2 w-2 rounded-full bg-current" /></span>
      </div>
      <div className="mt-2 text-xl font-bold text-slate-800">{value}</div>
      <div className="mt-1 text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

function PasswordPage({ role }: { role: string }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErr('');
    setNotice('');
    try {
      await api(`/${role}/akun/ganti-password`, json('PATCH', form));
      setNotice('Password berhasil diperbarui.');
      setForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memperbarui password.');
    }
  }
  return (
    <div className="card max-w-xl p-6">
      <h2 className="font-bold">Ubah Password</h2>
      <p className="mt-1 text-xs text-slate-500">Password baru minimal 6 karakter.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-xs font-semibold">Password saat ini<input className="input mt-2" type="password" required value={form.currentPassword} onChange={event => setForm({ ...form, currentPassword: event.target.value })} /></label>
        <label className="block text-xs font-semibold">Password baru<input className="input mt-2" type="password" minLength={6} required value={form.newPassword} onChange={event => setForm({ ...form, newPassword: event.target.value })} /></label>
        <Feedback err={err} notice={notice} />
        <button className="btn btn-primary"><Save size={15} /> Simpan Password</button>
      </form>
    </div>
  );
}

function AttendancePage() {
  const [statusAbsen, setStatusAbsen] = useState('HADIR');
  const [keterangan, setKeterangan] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoKeluar, setFotoKeluar] = useState<File | null>(null);
  const [today, setToday] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const canCheckout = today?.statusAbsen === 'HADIR' && !today?.jamKeluar;
  const checkedIn = Boolean(today);

  const load = useCallback(async () => {
    try {
      const dashboard = dataOf(await api('/siswa/dashboard'));
      setToday(dashboard?.absen_hari_ini || null);
      setHistory(Array.isArray(dashboard?.riwayat_absen) ? dashboard.riwayat_absen : []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memuat riwayat absensi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function checkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErr('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('statusAbsen', statusAbsen);
      if (keterangan) body.append('keterangan', keterangan);
      if (statusAbsen === 'HADIR' && foto) body.append('foto', foto);
      const response = await api('/siswa/absen/masuk', { method: 'POST', body });
      setToday(dataOf(response));
      await load();
      setNotice('Absensi masuk berhasil dikirim.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal mengirim absensi masuk.');
    }
  }

  async function checkOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErr('');
    setNotice('');
    if (!canCheckout) {
      setErr('Lakukan absen masuk berstatus HADIR terlebih dahulu.');
      return;
    }
    try {
      const body = new FormData();
      if (fotoKeluar) body.append('foto', fotoKeluar);
      const response = await api('/siswa/absen/keluar', { method: 'POST', body });
      setToday(dataOf(response));
      await load();
      setNotice('Absensi pulang berhasil dikirim.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal mengirim absensi pulang.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div><h2 className="text-sm font-bold text-slate-800">Status Kehadiran Hari Ini</h2><p className="mt-1 text-[11px] text-slate-400">{today ? `Status: ${today.statusAbsen}` : 'Belum melakukan absen masuk hari ini.'}</p></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => document.getElementById('attendance-checkin')?.scrollIntoView({ behavior: 'smooth' })} disabled={checkedIn || loading} className="btn btn-primary disabled:opacity-50"><Camera size={14} /> Check-in</button>
            <button type="button" onClick={() => document.getElementById('attendance-checkout')?.scrollIntoView({ behavior: 'smooth' })} disabled={!canCheckout} className="btn btn-light disabled:opacity-50"><Camera size={14} /> Check-out</button>
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <form id="attendance-checkin" onSubmit={checkIn} className="rounded-xl border border-slate-100 p-4">
            <h3 className="text-xs font-bold text-slate-700">Absen Masuk</h3>
            <label className="mt-3 block text-[11px] font-semibold">Status Kehadiran
              <select className="input mt-1" value={statusAbsen} disabled={checkedIn || loading} onChange={event => setStatusAbsen(event.target.value)}>
                <option>HADIR</option><option>IZIN</option><option>SAKIT</option>
              </select>
            </label>
            {statusAbsen !== 'HADIR' && <label className="mt-3 block text-[11px] font-semibold">Keterangan<textarea className="input mt-1" required value={keterangan} disabled={checkedIn} onChange={event => setKeterangan(event.target.value)} /></label>}
            {statusAbsen === 'HADIR' && <label className="mt-3 block text-[11px] font-semibold">Foto selfie masuk<input className="input mt-1" type="file" accept="image/*" capture="user" required disabled={checkedIn} onChange={event => setFoto(event.target.files?.[0] || null)} /></label>}
            <button disabled={checkedIn || loading} className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"><Camera size={14} /> {checkedIn ? 'Absen masuk tercatat' : 'Kirim Absen Masuk'}</button>
          </form>
          <form id="attendance-checkout" onSubmit={checkOut} className="rounded-xl border border-slate-100 p-4">
            <h3 className="text-xs font-bold text-slate-700">Absen Pulang</h3>
            <p className="mt-2 text-[11px] text-slate-400">Checkout hanya tersedia jika status check-in hari ini HADIR dan belum checkout.</p>
            <label className="mt-3 block text-[11px] font-semibold">Foto selfie pulang<input className="input mt-1" type="file" accept="image/*" capture="user" required disabled={!canCheckout} onChange={event => setFotoKeluar(event.target.files?.[0] || null)} /></label>
            <button disabled={!canCheckout} className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"><Camera size={14} /> {today?.jamKeluar ? 'Checkout tercatat' : 'Kirim Absen Pulang'}</button>
          </form>
        </div>
        <Feedback err={err} notice={notice} />
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4"><h2 className="text-sm font-bold text-slate-800">Riwayat Absensi</h2><p className="mt-1 text-[11px] text-slate-400">Riwayat kehadiran dari dashboard akun Anda.</p></div>
        {loading ? <EmptyState text="Memuat riwayat absensi..." /> : history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{['Tanggal', 'Status', 'Masuk', 'Pulang', 'Keterangan', 'Foto'].map(item => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{history.map((item, index) => <tr key={item.id ?? index}><td className="px-4 py-3">{cellValue(item, 'tanggal') || '-'}</td><td className="px-4 py-3">{label(item.statusAbsen)}</td><td className="px-4 py-3">{item.jamMasuk ? new Date(item.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="px-4 py-3">{item.jamKeluar ? new Date(item.jamKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="px-4 py-3">{label(item.keterangan)}</td><td className="space-x-1 px-4 py-3">{item.fotoMasukUrl && <a className="text-blue-600 hover:underline" href={item.fotoMasukUrl} target="_blank" rel="noreferrer">Masuk</a>}{item.fotoKeluarUrl && <a className="text-blue-600 hover:underline" href={item.fotoKeluarUrl} target="_blank" rel="noreferrer">Pulang</a>}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <EmptyState text="Belum ada riwayat absensi." />}
      </div>
    </div>
  );
}

function StudentApplication() {
  const [info, setInfo] = useState<any>(null);
  const [form, setForm] = useState({ dudiId: '', posisi: '' });
  const [companyForm, setCompanyForm] = useState<Row>({});
  const [companyModal, setCompanyModal] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [companyNotice, setCompanyNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const dashboard = dataOf(info);
  const companies = findRows(dashboard, ['list_dudi_disetujui']);
  const applications = findRows(dashboard, ['pengajuan_magang']);
  const latestApplication = applications[0];

  useEffect(() => {
    api('/siswa/dashboard')
      .then(setInfo)
      .catch(error => setErr(error instanceof Error ? error.message : 'Gagal memuat dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErr('');
    setNotice('');
    try {
      const id = Number(form.dudiId);
      if (!Number.isInteger(id) || id < 1) throw new Error('Pilih perusahaan mitra yang valid.');
      const response = await api('/siswa/pengajuan-magang', json('POST', { dudiId: id, posisi: form.posisi }));
      setNotice(response?.message || 'Pengajuan magang berhasil dikirim.');
      setForm({ dudiId: '', posisi: '' });
      try {
        setInfo(await api('/siswa/dashboard'));
      } catch (error) {
        setErr(`Pengajuan berhasil dikirim, tetapi status terbaru gagal dimuat: ${error instanceof Error ? error.message : 'kesalahan tidak diketahui'}`);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal mengirim pengajuan magang.');
    }
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyError('');
    setCompanyNotice('');
    const body = { ...companyForm, kuota_peserta: companyForm.kuota_peserta === true || companyForm.kuota_peserta === 'true' };
    try {
      const response = await api('/siswa/admin/perusahaan', json('POST', body));
      setCompanyNotice(response?.message || 'Usulan perusahaan berhasil dikirim untuk validasi admin.');
      setCompanyForm({});
      setCompanyModal(false);
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : 'Gagal mengirim usulan perusahaan.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><h2 className="font-bold">Pengajuan Magang</h2><p className="mt-1 text-xs text-slate-500">Pilih mitra yang sudah diverifikasi admin dan tentukan posisi yang diajukan.</p></div>
          <button type="button" className="btn btn-light" onClick={() => setCompanyModal(true)}><Plus size={14} /> Usulkan Perusahaan</button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Perusahaan Mitra
            {companies.length ? (
              <select className="input mt-2" required value={form.dudiId} onChange={event => setForm({ ...form, dudiId: event.target.value })}>
                <option value="">Pilih perusahaan</option>
                {companies.map((company, index) => {
                  const companyId = company.id ?? company.dudiId;
                  return <option key={companyId ?? index} value={companyId}>{label(company.nama_perusahaan ?? company.nama ?? company.name)}{company.bidang_usaha ? ` · ${label(company.bidang_usaha)}` : ''}</option>;
                })}
              </select>
            ) : (
              <div className="input mt-2 text-slate-400">{loading ? 'Memuat perusahaan...' : 'Belum ada perusahaan terverifikasi.'}</div>
            )}
          </label>
          <label className="text-xs font-semibold text-slate-600">Posisi yang Diajukan<input className="input mt-2" required value={form.posisi} onChange={event => setForm({ ...form, posisi: event.target.value })} /></label>
          <div className="sm:col-span-2"><button disabled={!companies.length || loading} className="btn btn-primary disabled:opacity-50"><Plus size={15} /> Kirim Pengajuan</button></div>
        </form>
        <Feedback err={err} notice={notice} />
      </div>
      <div className="card p-6">
        <h2 className="font-bold">Status Pengajuan</h2>
        <p className="mt-3 text-sm text-slate-600">{label(latestApplication?.status ?? 'Belum mengajukan magang.')}</p>
        {latestApplication && <p className="mt-2 text-xs text-slate-500">{label(latestApplication.dudi?.nama_perusahaan)} · {label(latestApplication.posisi)}</p>}
        {companies.length > 0 && <p className="mt-2 text-xs text-slate-500">{companies.length} perusahaan mitra disetujui tersedia.</p>}
      </div>
      {companyError && <Feedback err={companyError} notice="" />}
      {companyNotice && <Feedback err="" notice={companyNotice} />}
      {companyModal && <Modal title="Usulkan Perusahaan Mitra" onClose={() => setCompanyModal(false)}><form onSubmit={submitCompany} className="space-y-4">{companyFields.map(field => <FormField key={field.name} field={field} value={companyForm[field.name]} onChange={value => setCompanyForm({ ...companyForm, [field.name]: value })} />)}<Feedback err={companyError} notice="" /><button className="btn btn-primary"><Save size={14} /> Kirim Usulan</button></form></Modal>}
    </div>
  );
}

function AdminMonitoringPage() {
  const [tab, setTab] = useState<'siswa' | 'kunjungan'>('siswa');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <button onClick={() => setTab('siswa')} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === 'siswa' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Monitoring Kehadiran & Jurnal Siswa</button>
        <button onClick={() => setTab('kunjungan')} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === 'kunjungan' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Kunjungan Guru Pembimbing</button>
      </div>
      <ResourcePage role="admin" section={tab === 'siswa' ? 'monitoring-siswa' : 'monitoring-kunjungan'} />
    </div>
  );
}

function AdminPlacementsPage() {
  return (
    <div className="space-y-5">
      <PendingApplications />
      <ResourcePage role="admin" section="penempatan-data" />
    </div>
  );
}

function PendingApplications() {
  const [applications, setApplications] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Row[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [applicationResponse, teacherResponse] = await Promise.all([
        api('/admin/pengajuan-magang'),
        api('/admin/guru?status=AKTIF'),
      ]);
      setApplications(rowsOf(applicationResponse));
      setTeachers(rowsOf(teacherResponse));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memuat pengajuan dan guru aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(application: Row, status: 'DISETUJUI' | 'DITOLAK') {
    const id = idOf(application);
    if (!id) {
      setErr('ID pengajuan tidak ditemukan.');
      return;
    }
    const body: Row = { status };
    if (status === 'DISETUJUI') {
      const teacherId = selectedTeachers[id];
      if (!teacherId) {
        setErr('Pilih guru pembimbing aktif sebelum menyetujui pengajuan.');
        return;
      }
      body.guruPembimbingId = Number(teacherId);
    }
    setErr('');
    setNotice('');
    try {
      const response = await api(`/admin/pengajuan-magang/${id}/status`, json('PATCH', body));
      setNotice(response?.message || `Pengajuan berhasil ${status === 'DISETUJUI' ? 'disetujui' : 'ditolak'}.`);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memproses pengajuan.');
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 p-4">
        <div><h2 className="text-sm font-bold text-slate-800">Pengajuan Magang Menunggu Validasi</h2><p className="mt-1 text-[11px] text-slate-500">Pilih guru aktif saat menyetujui penempatan siswa.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">{applications.length} pengajuan</span><button className="btn btn-light" onClick={load}><RefreshCw size={13} /> Refresh</button></div>
      </div>
      <Feedback err={err} notice={notice} />
      {loading ? <EmptyState text="Memuat pengajuan..." /> : applications.length ? (
        <div className="divide-y divide-slate-100">
          {applications.map(application => {
            const id = idOf(application);
            return (
              <div key={id} className="grid gap-3 p-4 lg:grid-cols-[1fr_240px_auto] lg:items-center">
                <div>
                  <div className="text-xs font-semibold text-slate-800">{label(application.siswa?.nama)} <span className="font-normal text-slate-400">· {label(application.siswa?.kelas)}</span></div>
                  <div className="mt-1 text-[11px] text-slate-500">{label(application.dudi?.nama_perusahaan)} · {label(application.posisi)}</div>
                  <div className="mt-1 text-[10px] text-slate-400">Diajukan {label(application.createdAt ? new Date(application.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-')}</div>
                </div>
                <select className="input" value={selectedTeachers[id] || ''} onChange={event => setSelectedTeachers({ ...selectedTeachers, [id]: event.target.value })}>
                  <option value="">Pilih guru pembimbing aktif</option>
                  {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.namalengkap} · {teacher.jurusan}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-danger" onClick={() => decide(application, 'DITOLAK')}><X size={14} /> Tolak</button>
                  <button className="btn btn-primary" disabled={!selectedTeachers[id]} onClick={() => decide(application, 'DISETUJUI')}><Check size={14} /> Setujui Penempatan</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState text="Tidak ada pengajuan yang menunggu keputusan." />}
    </section>
  );
}

function GuruJournalAttendancePage() {
  const [tab, setTab] = useState<'jurnal' | 'absensi'>('jurnal');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('jurnal')} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === 'jurnal' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Jurnal</button>
        <button onClick={() => setTab('absensi')} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === 'absensi' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Absensi Siswa</button>
      </div>
      {tab === 'jurnal' ? <ResourcePage role="guru" section="jurnal" /> : <GuruAttendancePanel />}
    </div>
  );
}

function GuruAttendancePanel() {
  const [students, setStudents] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setStudents(rowsOf(await api('/guru/siswa')));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memuat siswa bimbingan.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openDetail(studentId: number) {
    setErr('');
    setDetailLoading(true);
    try {
      setDetail(dataOf(await api(`/guru/siswa/${studentId}`)));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal memuat detail absensi.');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><MetricCard title="Total Bimbingan" value={students.length} detail="Siswa dibimbing" /><MetricCard title="Sedang Aktif" value={students.filter(item => item.siswa?.status === 'SEDANG_MAGANG').length} detail="Aktif di tempat magang" tone="amber" /><MetricCard title="Selesai / Dinilai" value={students.filter(item => item.siswa?.status === 'LULUS').length} detail="Sudah menyelesaikan PKL" tone="green" /></div>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4"><h2 className="text-sm font-bold text-slate-800">Statistik dan Riwayat Absensi Siswa</h2><p className="mt-1 text-[11px] text-slate-400">Pilih siswa bimbingan untuk melihat statistik kehadiran dan riwayat absen.</p></div>
        {err && <Feedback err={err} notice="" />}
        {loading ? <EmptyState text="Memuat siswa bimbingan..." /> : students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{['Nama Siswa', 'Kelas', 'Tempat Magang', 'Status', 'Aksi'].map(item => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{students.map(item => {
                const student = item.siswa || item;
                const placement = item.penempatan || {};
                return <tr key={student.id}><td className="px-4 py-3 font-semibold text-slate-700">{label(student.nama)}</td><td className="px-4 py-3">{label(student.kelas)}</td><td className="px-4 py-3">{label(placement.dudi?.nama_perusahaan)}</td><td className="px-4 py-3">{label(student.status)}</td><td className="px-4 py-3"><button className="btn btn-light" onClick={() => openDetail(student.id)}>Lihat Detail</button></td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState text="Belum ada siswa bimbingan." />}
      </div>
      {detailLoading && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 text-sm font-medium text-white">Memuat detail absensi...</div>}
      {detail && <Modal title={`Absensi · ${label(detail.siswa?.nama)}`} onClose={() => setDetail(null)}>
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(detail.statistik_kehadiran || {}).map(([key, value]) => <InfoTile key={key} label={titleCase(key)} value={label(value)} />)}
        </div>
        <div className="mt-4"><InfoTile label="Tempat Magang" value={label(detail.tempat_magang?.nama_perusahaan)} /></div>
        <div className="mt-5">
          <h3 className="text-xs font-bold text-slate-700">Riwayat Absensi</h3>
          {detail.riwayat_absensi?.length ? <div className="mt-2 max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] text-slate-400"><tr>{['Tanggal', 'Status', 'Masuk', 'Pulang', 'Keterangan', 'Foto'].map(value => <th key={value} className="px-3 py-2">{value}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{detail.riwayat_absensi.map((item: Row) => <tr key={item.id}><td className="px-3 py-2">{label(cellValue(item, 'tanggal'))}</td><td className="px-3 py-2">{label(item.statusAbsen)}</td><td className="px-3 py-2">{label(item.jamMasuk)}</td><td className="px-3 py-2">{label(item.jamKeluar)}</td><td className="px-3 py-2">{label(item.keterangan)}</td><td className="space-x-1 px-3 py-2">{item.fotoMasukUrl && <a className="text-blue-600 hover:underline" href={item.fotoMasukUrl} target="_blank" rel="noreferrer">Masuk</a>}{item.fotoKeluarUrl && <a className="text-blue-600 hover:underline" href={item.fotoKeluarUrl} target="_blank" rel="noreferrer">Pulang</a>}</td></tr>)}</tbody></table></div> : <EmptyState text="Belum ada riwayat absensi." />}
        </div>
      </Modal>}
    </div>
  );
}

function AuditUnavailablePage() {
  return <div className="card p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><Eye size={20} /></div><h2 className="mt-4 font-bold text-slate-800">Log Aktivitas & Audit</h2><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Menu ini tersedia mengikuti navigasi sistem, tetapi backend yang dilampirkan belum menyediakan endpoint log aktivitas/audit. Data tidak ditampilkan sebagai data contoh.</p></div>;
}

function Dashboard({ role }: { role: string }) {
  const [datasets, setDatasets] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sources: Record<string, string> = role === 'admin'
      ? {
          students: '/admin/monitoring/siswa',
          teachers: '/admin/guru',
          companies: '/admin/mitra',
          applications: '/admin/pengajuan-magang',
          visits: '/admin/monitoring/kunjungan',
        }
      : role === 'guru'
        ? {
            students: '/guru/siswa',
            journals: '/guru/jurnal',
            visits: '/guru/kunjungan',
          }
        : {
            dashboard: '/siswa/dashboard',
            journals: '/siswa/jurnal',
          };
    setLoading(true);
    setErrors([]);
    Promise.all(Object.entries(sources).map(async ([key, path]) => {
      let result: any;
      try {
        result = await api(path);
      } catch (error) {
        result = { requestError: error instanceof Error ? error.message : 'Gagal memuat data.' };
      }
      if (!active) return;
      setDatasets(current => ({ ...current, [key]: result }));
      if (result?.requestError) setErrors(current => [...current, result.requestError]);
      if (key === 'dashboard') setLoading(false);
    })).finally(() => {
      if (active) setLoading(false);
    });
    const refreshStudentDashboard = () => {
      if (document.visibilityState !== 'visible') return;
      api('/siswa/dashboard')
        .then(response => {
          if (active) setDatasets(current => ({ ...current, dashboard: response }));
        })
        .catch(error => {
          if (active) {
            const message = error instanceof Error ? error.message : 'Gagal memuat dashboard siswa.';
            setErrors(current => current.includes(message) ? current : [...current, message]);
          }
        });
    };
    if (role === 'siswa') window.addEventListener('focus', refreshStudentDashboard);
    return () => {
      active = false;
      if (role === 'siswa') window.removeEventListener('focus', refreshStudentDashboard);
    };
  }, [role]);

  const name = getUser()?.namalengkap || getUser()?.nama || getUser()?.name || 'Pengguna';
  const students = rowsOf(datasets.students);
  const teachers = rowsOf(datasets.teachers);
  const companies = rowsOf(datasets.companies);
  const applications = rowsOf(datasets.applications);
  const visits = rowsOf(datasets.visits);
  const journals = rowsOf(datasets.journals);
  const studentDashboard = datasets.dashboard;
  const studentData = dataOf(studentDashboard);
  const availableCompanies = findRows(studentData, ['list_dudi_disetujui']);

  if (role === 'siswa') {
    const applications = findRows(studentData, ['pengajuan_magang']);
    const approvedApplication = applications.find(application => application.status === 'DISETUJUI');
    const placement = approvedApplication || applications[0] || {};
    const student = studentData?.siswa || {};
    const attendanceToday = studentData?.absen_hari_ini;
    const company = placement.dudi?.nama_perusahaan || '-';
    const adviser = placement.guruPembimbing?.namalengkap || '-';
    const dashboardError = Boolean(studentDashboard?.requestError);
    const applicationStatus = placement.status || (loading ? 'Memuat status...' : dashboardError ? 'Status gagal dimuat' : 'Belum mengajukan magang');
    const internshipStatus = student.status === 'LULUS'
      ? 'LULUS'
      : approvedApplication
        ? 'SEDANG_MAGANG'
        : student.status || (loading ? 'Memuat status...' : dashboardError ? 'Status gagal dimuat' : 'BELUM_MAGANG');
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 p-5 text-white">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Portal Siswa · {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
          <h2 className="mt-2 text-xl font-bold">Semangat magang, {label(student.nama || name)}!</h2>
          <p className="mt-1 text-xs text-blue-100">Pantau pengajuan, jurnal, dan kegiatan praktik kerja lapangan Anda.</p>
        </div>
        {errors.length > 0 && <Feedback err={errors.join(' ')} notice="" />}
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Tempat Magang" value={label(company)} detail="Lokasi praktik Anda" />
          <MetricCard title="Status Magang" value={label(internshipStatus)} detail="Status siswa dari sekolah" tone="green" />
          <MetricCard title="Jurnal Ditulis" value={journals.length} detail="Total jurnal kegiatan" tone="purple" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div><h3 className="text-sm font-bold text-slate-800">Informasi Magang</h3><p className="mt-1 text-[11px] text-slate-400">Detail tempat dan pembimbing magang Anda.</p></div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{label(internshipStatus)}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile label="Tempat Magang (DUDI)" value={label(company)} />
              <InfoTile label="Guru Pembimbing" value={label(adviser)} />
              <InfoTile label="Posisi" value={label(placement.posisi)} />
              <InfoTile label="Status Pengajuan" value={label(applicationStatus)} />
              <InfoTile label="Periode Pengajuan" value={label(placement.createdAt ? new Date(placement.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-')} />
              <InfoTile label="Kelas" value={label(student.kelas)} />
              <InfoTile label="Kehadiran Hari Ini" value={attendanceToday ? `${label(attendanceToday.statusAbsen)} · ${label(attendanceToday.jamMasuk)}` : 'Belum absen'} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-800">DUDI Disetujui</h3>
            <p className="mt-1 text-[11px] text-slate-400">Perusahaan yang tersedia untuk pengajuan magang.</p>
            {availableCompanies.length ? (
              <div className="mt-3 divide-y divide-slate-100">
                {availableCompanies.slice(0, 4).map((item, index) => <div key={idOf(item) || index} className="py-2 text-xs"><div className="font-semibold text-slate-700">{label(item.nama_perusahaan)}</div><div className="mt-1 text-[10px] text-slate-400">{label(item.bidang_usaha || item.alamat)}</div></div>)}
              </div>
            ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">{loading ? 'Memuat daftar perusahaan...' : 'Belum ada perusahaan yang tersedia.'}</p>}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-800">Jurnal Kegiatan Terbaru</h3><p className="mt-1 text-[11px] text-slate-400">Aktivitas jurnal magang Anda.</p></div><span className="text-xs font-semibold text-blue-600">{journals.length} jurnal</span></div>
          {journals.length ? <div className="mt-3 divide-y divide-slate-100">{journals.slice(0, 4).map((item, index) => <div key={idOf(item) || index} className="flex items-start justify-between gap-3 py-3"><div><p className="text-xs font-medium text-slate-700">{label(item.rincianKegiatan || item.kegiatan || item.judul)}</p><p className="mt-1 text-[10px] text-slate-400">{label(item.tanggalPelaksana || item.tanggal)}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{label(item.status || 'MENUNGGU')}</span></div>)}</div> : <EmptyState text={loading ? 'Memuat jurnal...' : 'Belum ada jurnal kegiatan.'} />}
        </div>
      </div>
    );
  }

  const adminCards = [
    ['Total Siswa', students.length, 'Data siswa terdaftar', 'blue'],
    ['Guru Pembimbing', teachers.length, 'Guru terdaftar', 'purple'],
    ['Mitra DUDI', companies.length, 'Perusahaan mitra', 'green'],
    ['Menunggu Validasi', applications.length, 'Pengajuan menunggu keputusan', 'amber'],
  ] as const;
  const guruCards = [
    ['Siswa Bimbingan', students.length, 'Siswa aktif magang', 'blue'],
    ['Jurnal Perlu Evaluasi', journals.filter(item => /MENUNGGU|REVISI/i.test(String(item.status || ''))).length, 'Perlu ditinjau segera', 'amber'],
    ['Kunjungan Tercatat', visits.length, 'Riwayat kunjungan', 'green'],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 p-5 text-white shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Portal {role} · {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
        <h2 className="mt-2 text-xl font-bold">Selamat datang kembali, {label(name)}</h2>
        <p className="mt-1 text-xs text-blue-100">{role === 'admin' ? `${applications.length} pengajuan menunggu validasi Anda.` : `${journals.length} jurnal bimbingan menunggu evaluasi.`}</p>
      </div>
      {errors.length > 0 && <Feedback err={errors.join(' ')} notice="" />}
      <div className={`grid gap-3 ${role === 'admin' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {(role === 'admin' ? adminCards : guruCards).map(([title, value, detail, tone]) => <MetricCard key={title} title={title} value={loading ? '—' : value} detail={detail} tone={tone} />)}
      </div>
      {role === 'admin' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="card p-5 lg:col-span-3">
            <h3 className="text-sm font-bold text-slate-800">Status Pengajuan Magang</h3>
            <p className="mt-1 text-[11px] text-slate-400">Ringkasan permohonan yang menunggu keputusan admin.</p>
            <div className="mt-6 flex items-center justify-between rounded-lg bg-amber-50 p-4">
              <span className="text-xs font-medium text-amber-800">Menunggu validasi</span>
              <span className="text-lg font-bold text-amber-700">{loading ? '—' : applications.length}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400" /></div>
            <p className="mt-2 text-[10px] text-slate-400">Daftar pada dashboard mengikuti endpoint pengajuan yang menunggu keputusan.</p>
          </div>
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800">Aktivitas Kunjungan</h3>
            <p className="mt-1 text-[11px] text-slate-400">Catatan kunjungan terbaru guru pembimbing.</p>
            {visits.slice(0, 3).map((item, index) => <div key={idOf(item) || index} className="border-b border-slate-100 py-3 last:border-0"><div className="text-xs font-semibold text-slate-700">{label(item.dudi?.nama_perusahaan || item.nama_perusahaan || item.dudi || item.tempatMagang)}</div><div className="mt-1 text-[10px] text-slate-400">{label(item.tanggalKunjungan || item.tanggal)} · {label(item.guruPembimbing?.namalengkap || item.guru || item.guruPembimbing)}</div></div>)}
            {!visits.length && <EmptyState text={loading ? 'Memuat kunjungan...' : 'Belum ada kunjungan tercatat.'} />}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Jurnal Perlu Evaluasi</h3><span className="text-xs text-amber-600">{journals.length}</span></div>
            {journals.length ? journals.slice(0, 5).map((item, index) => <div key={idOf(item) || index} className="border-b border-slate-100 py-3 last:border-0"><div className="text-xs font-medium text-slate-700">{label(item.rincianKegiatan || item.kegiatan || item.judul)}</div><div className="mt-1 text-[10px] text-slate-400">{label(item.siswa?.namalengkap || item.siswa || item.namaSiswa)} · {label(item.status || 'MENUNGGU')}</div></div>) : <EmptyState text={loading ? 'Memuat jurnal...' : 'Semua jurnal sudah dievaluasi.'} />}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Daftar Siswa Bimbingan</h3><span className="text-xs text-blue-600">{students.length} siswa</span></div>
            {students.length ? students.slice(0, 5).map((item, index) => {
              const student = item.siswa || item;
              const placement = item.penempatan || {};
              return <div key={student.id || index} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><div><div className="text-xs font-semibold text-slate-700">{label(student.nama || student.namalengkap)}</div><div className="mt-1 text-[10px] text-slate-400">{label(student.kelas)} · {label(placement.dudi?.nama_perusahaan)}</div></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{label(student.status || placement.statusPengajuan || 'Aktif')}</span></div>;
            }) : <EmptyState text={loading ? 'Memuat siswa...' : 'Belum ada siswa bimbingan.'} />}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({ label: caption, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-400">{caption}</div><div className="mt-1 text-xs font-semibold text-slate-700">{value}</div></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-8 text-center text-xs text-slate-400">{text}</div>;
}
