export default function Button({ children, variant = 'primary', size = 'md', loading, ...props }) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50',
  };
  const sizes = { sm: 'text-sm px-3 py-1.5', md: '', lg: 'text-base px-6 py-3' };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} flex items-center gap-2`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
