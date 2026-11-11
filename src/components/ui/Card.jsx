export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-[22px] ring-1 ring-black/[0.05] shadow-2xs ${className}`}>
      {children}
    </div>
  );
}
