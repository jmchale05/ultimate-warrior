
interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: Props) {
  return (
    <div
      className={`bg-stone-800 border border-stone-700 rounded-xl shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
