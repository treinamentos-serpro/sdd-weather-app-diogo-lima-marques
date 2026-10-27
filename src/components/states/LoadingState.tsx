interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Carregando dados...' }: LoadingStateProps) {
  return (
    <p
      role="status"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 font-sans text-white shadow-glass backdrop-blur-md"
    >
      {message}
    </p>
  );
}
