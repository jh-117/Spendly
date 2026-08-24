export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`max-w-[768px] mx-auto px-5 ${className}`}>
      {children}
    </div>
  );
}
