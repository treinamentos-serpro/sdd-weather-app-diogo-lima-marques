import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmptyState from '../../src/components/states/EmptyState';
import ErrorState from '../../src/components/states/ErrorState';
import LoadingState from '../../src/components/states/LoadingState';

afterEach(cleanup);

describe('estados de apresentação', () => {
  it('anuncia carregamento com role status e permite personalizar a mensagem', () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados...');

    rerender(<LoadingState message="Carregando previsão..." />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando previsão...');
  });

  it('mostra título e dica no estado vazio', () => {
    render(
      <EmptyState title="Nenhuma cidade encontrada." hint="Verifique o nome e tente novamente." />,
    );

    expect(screen.getByRole('region', { name: 'Nenhuma cidade encontrada.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Nenhuma cidade encontrada.',
    );
    expect(screen.getByText('Verifique o nome e tente novamente.')).toBeInTheDocument();
  });

  it('anuncia erro e só executa retry por interação, sem enviar formulário ancestral', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ErrorState message="Não foi possível carregar a previsão." onRetry={onRetry} />
      </form>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar a previsão.');
    expect(onRetry).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onRetry).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
