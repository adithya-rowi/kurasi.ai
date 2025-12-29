export function Logo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small: 'text-lg',
    default: 'text-xl', 
    large: 'text-3xl'
  };
  
  const iconSizes = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-10 h-10'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${iconSizes[size]} bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center`}>
        <span className="text-white font-bold">L</span>
      </div>
      <span className={`font-bold text-slate-900 ${sizes[size]}`}>
        Loper
      </span>
    </div>
  );
}
