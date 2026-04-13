import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';

export default function ClientCard({ client }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/dashboard/${client.slug}`)}
      className="card border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-white" />
        </div>

        {/* Status badge */}
        <span className={client.has_schema ? 'badge-active' : 'badge-placeholder'}>
          {client.has_schema ? 'Live' : 'Coming Soon'}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
          {client.display_name}
        </h3>
        {client.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{client.description}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">
          {client.has_schema ? client.schema_name : 'No schema yet'}
        </span>
        <ArrowRight
          size={16}
          className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
        />
      </div>
    </div>
  );
}
