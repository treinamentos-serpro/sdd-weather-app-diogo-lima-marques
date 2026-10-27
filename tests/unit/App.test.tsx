import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { mockWeatherData } from '../../src/mocks/weather';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App com dados mock', () => {
  it('inicia com layout completo em Celsius sem consultar a API', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'WeatherView' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Unidade de temperatura' })).toBeInTheDocument();
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(within(screen.getByRole('contentinfo')).getByRole('link')).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    );
    expect(screen.getByText(/Demonstração com dados fictícios/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('converte hero e todos os cards por teclado e preserva os valores do mock', async () => {
    const user = userEvent.setup();
    const original = JSON.stringify(mockWeatherData);
    render(<App />);

    screen.getByRole('button', { name: '°F' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByText(/°F$/)).toHaveLength(11);
    expect(within(screen.getByRole('main')).queryAllByText(/°C$/)).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '°C' }));
    expect(within(screen.getByRole('main')).getAllByText(/°C$/)).toHaveLength(11);
    expect(JSON.stringify(mockWeatherData)).toBe(original);
  });

  it('permite buscar o mock a partir do estado idle', async () => {
    const user = userEvent.setup();
    render(<App initialStatus="idle" />);

    expect(screen.getByRole('heading', { name: 'Como está o tempo por aí?' })).toBeInTheDocument();
    expect(screen.queryByText('23,5 °C')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), '  sao paulo  {Enter}');
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
  });

  it('bloqueia a busca durante loading e não exibe dados de sucesso', () => {
    render(<App initialStatus="loading" />);

    const loading = screen.getByText('Carregando clima e previsão...');
    expect(loading).toHaveAttribute('role', 'status');
    expect(loading.closest('[aria-busy="true"]')).toBeNull();
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('23,5 °C')).not.toBeInTheDocument();
  });

  it('mostra o estado empty sem reutilizar dados da cidade de exemplo', () => {
    render(<App initialStatus="empty" />);

    expect(screen.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('23,5 °C')).not.toBeInTheDocument();
  });

  it('reapresenta o mock por retry explícito mantendo a unidade', async () => {
    const user = userEvent.setup();
    render(<App initialStatus="error" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('23,5 °C')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '°F' }));
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('preserva a unidade entre buscas locais sem atribuir o mock a outra cidade', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<App />);
    await user.click(screen.getByRole('button', { name: '°F' }));
    await user.type(screen.getByRole('searchbox'), 'Recife{Enter}');

    expect(screen.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Resultado da busca' })).toHaveTextContent(
      'Nenhuma cidade encontrada.',
    );
    expect(
      screen.queryByRole('region', { name: 'Clima atual em São Paulo' }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'São Paulo{Enter}');
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Resultado da busca' })).toHaveTextContent(
      'Clima e previsão de São Paulo disponíveis.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('não muda a tela ao tentar buscar entrada vazia', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome de uma cidade.');
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
  });
});
