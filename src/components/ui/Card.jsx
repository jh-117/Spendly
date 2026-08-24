export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}
