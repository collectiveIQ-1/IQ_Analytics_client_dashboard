export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizeMap[size]} border-2 border-slate-200 dark:border-zinc-800 border-t-red-600 dark:border-t-red-500 rounded-full animate-spin`} />
      {text && <p className="text-sm text-slate-500 dark:text-zinc-400">{text}</p>}
    </div>
  );
}
