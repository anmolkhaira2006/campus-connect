export const Button = ({ children, color, size, className, ...props }) => {
  const base = "font-headline font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  
  const colors = {
    primary: "bg-primary hover:bg-primary-dark text-white shadow-md",
    secondary: "bg-white-container-low hover:bg-white-container border border-outline-variant text-on-surface",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  return (
    <button className={`${base} ${colors[color] || colors.primary} ${sizes[size] || sizes.md} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};
