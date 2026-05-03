import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Database, Zap, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api/clients.api';
import { useAuth } from '../../contexts/AuthContext';

const LIVE_GRAD        = 'from-emerald-500 to-green-700';
const COMING_SOON_GRAD = 'from-amber-400 to-yellow-500';

/* ── Live toggle switch (super_admin only) ─────────────────────────────────── */
function LiveToggle({ client }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (is_live) => clientsApi.toggleLive(client.id, is_live),
    onMutate: async (is_live) => {
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      const previous = queryClient.getQueryData(['clients']);
      queryClient.setQueryData(['clients'], (old) =>
        old ? old.map((c) => (c.id === client.id ? { ...c, is_live } : c)) : old
      );
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      queryClient.setQueryData(['clients'], ctx.previous);
      toast.error('Failed to update live status.');
    },
    onSuccess: (_data, is_live) => {
      toast.success(is_live ? 'Marked as Live' : 'Set to Coming Soon');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const isLive = Boolean(client.is_live);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); mutation.mutate(!isLive); }}
      disabled={mutation.isPending}
      title={isLive ? 'Mark as Coming Soon' : 'Mark as Live'}
      className="flex items-center gap-1 disabled:opacity-60"
    >
      <span className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        isLive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600',
      ].join(' ')}>
        <span className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'transform transition-transform duration-200 ease-in-out',
          isLive ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')} />
      </span>
    </button>
  );
}

/* ── Client card ───────────────────────────────────────────────────────────── */
export default function ClientCard({ client, index = 0 }) {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isLive       = Boolean(client.is_live);
  const headerGrad   = isLive ? LIVE_GRAD : COMING_SOON_GRAD;

  const handleCardClick = () => {
    if (!isLive && !isSuperAdmin) {
      toast('This dashboard is coming soon!', { icon: 'clock' });
      return;
    }
    navigate('/dashboard/' + client.slug);
  };

  return (
    <div
      onClick={handleCardClick}
      className={[
        'group flex flex-col overflow-hidden p-0 rounded-2xl',
        'bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm',
        'transition-all duration-200',
        isLive
          ? 'hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer'
          : isSuperAdmin
            ? 'hover:shadow-md cursor-pointer opacity-90'
            : 'cursor-default opacity-80',
      ].join(' ')}
    >
      {/* Coloured top strip */}
      <div className={'bg-gradient-to-br ' + headerGrad + ' h-1.5 w-full'} />

      <div className="p-5 flex flex-col flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
          <div className={'w-11 h-11 bg-gradient-to-br ' + headerGrad + ' rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm'}>
            {client.display_name.slice(0, 2).toUpperCase()}
          </div>

          {/* Badge + toggle */}
          <div className="flex flex-col items-end gap-1.5">
            {isLive ? (
              <span className="badge-green inline-flex items-center gap-1">
                <Zap size={10} /> Live
              </span>
            ) : (
              <span className="badge-amber inline-flex items-center gap-1">
                <Clock size={10} /> Coming Soon
              </span>
            )}
            {isSuperAdmin && <LiveToggle client={client} />}
          </div>
        </div>

        {/* Name & description */}
        <div className="flex-1">
          <h3 className={[
            'font-bold text-slate-800 text-base leading-tight transition-colors dark:text-white',
            isLive
              ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              : 'group-hover:text-amber-500 dark:group-hover:text-amber-400',
          ].join(' ')}>
            {client.display_name}
          </h3>
          {client.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed dark:text-zinc-500">
              {client.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
            <Database size={11} />
            <span className="font-mono truncate max-w-[110px]">
              {client.schema_name || 'No schema'}
            </span>
          </div>
          <div className={[
            'w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center transition-colors dark:bg-zinc-900',
            isLive
              ? 'group-hover:bg-emerald-600 dark:group-hover:bg-emerald-600'
              : 'group-hover:bg-amber-500 dark:group-hover:bg-amber-500',
          ].join(' ')}>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-white transition-colors dark:text-zinc-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
