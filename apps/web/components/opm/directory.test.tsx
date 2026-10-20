import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonError, stubApi } from '@/test/api-fake';
import { makeProfile } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { Directory } from './directory';

const people = [
  makeProfile({
    id: '1',
    fullName: 'Anna Kowalska',
    city: 'Warsaw',
    cohort: 'OPM 48',
    industry: 'Fintech',
  }),
  makeProfile({
    id: '2',
    fullName: 'James Whitfield',
    city: 'London',
    cohort: 'OPM 50',
    industry: 'Fintech',
    skills: ['lending'],
  }),
  makeProfile({
    id: '3',
    fullName: 'Lena Fischer',
    city: 'Berlin',
    cohort: 'OPM 50',
    industry: 'CleanTech',
    skills: ['solar'],
  }),
  makeProfile({
    id: '4',
    fullName: 'Ivan Petrov',
    city: 'London',
    cohort: 'OPM 48',
    industry: 'CleanTech',
    skills: ['batteries'],
  }),
];

async function setup() {
  stubApi({ 'GET /profiles': people });
  renderWithProviders(<Directory />);
  await screen.findByRole('heading', { name: '4 of 4 alumni' });
}

const names = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const chip = (name: string) => screen.getByRole('button', { name });

describe('Directory', () => {
  it('lists every alumnus with the total in the heading', async () => {
    await setup();
    expect(names()).toEqual(['Anna Kowalska', 'James Whitfield', 'Lena Fischer', 'Ivan Petrov']);
  });

  it('builds filter chips from the data, one group per dimension', async () => {
    await setup();
    for (const label of ['City', 'Cohort', 'Industry']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const value of [
      'Berlin',
      'London',
      'Warsaw',
      'OPM 48',
      'OPM 50',
      'Fintech',
      'CleanTech',
    ]) {
      expect(chip(value)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('filters by one chip and toggles it off again', async () => {
    const user = userEvent.setup();
    await setup();
    await user.click(chip('London'));
    expect(chip('London')).toHaveAttribute('aria-pressed', 'true');
    expect(names()).toEqual(['James Whitfield', 'Ivan Petrov']);
    expect(screen.getByRole('heading', { name: '2 of 4 alumni' })).toBeInTheDocument();

    await user.click(chip('London'));
    expect(names()).toHaveLength(4);
  });

  it('ANDs filters across groups and replaces within a group', async () => {
    const user = userEvent.setup();
    await setup();
    await user.click(chip('London'));
    await user.click(chip('CleanTech'));
    expect(names()).toEqual(['Ivan Petrov']);

    await user.click(chip('Berlin')); // same group as London: replaces it
    expect(chip('London')).toHaveAttribute('aria-pressed', 'false');
    expect(names()).toEqual(['Lena Fischer']);
  });

  it('debounces search input: results only change after typing pauses', async () => {
    const user = userEvent.setup();
    await setup();
    await user.type(screen.getByRole('textbox', { name: 'Search alumni' }), 'batter');
    // Typing finished well inside the debounce window, so nothing has been filtered yet.
    expect(names()).toHaveLength(4);
    await waitFor(() => expect(names()).toEqual(['Ivan Petrov']));
  });

  it('searches across skills and clears back to the full list', async () => {
    const user = userEvent.setup();
    await setup();
    const box = screen.getByRole('textbox', { name: 'Search alumni' });
    await user.type(box, 'LENDING');
    await waitFor(() => expect(names()).toEqual(['James Whitfield']));

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(box).toHaveValue('');
    expect(names()).toHaveLength(4);
  });

  it('shows an empty state inside the grid and clears everything with one click', async () => {
    const user = userEvent.setup();
    await setup();
    await user.click(chip('Warsaw'));
    await user.click(chip('CleanTech'));
    expect(screen.getByText('No alumni match your filters')).toBeInTheDocument();
    expect(names()).toEqual([]);

    const empty = screen.getByText('No alumni match your filters').closest('div')!.parentElement!;
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(names()).toHaveLength(4);
    expect(chip('Warsaw')).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the "Clear filters" slot out of the accessibility tree until filters are active', async () => {
    const user = userEvent.setup();
    await setup();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    await user.click(chip('Berlin'));
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('explains when the directory itself could not load', async () => {
    stubApi({ 'GET /profiles': () => jsonError(500, 'db down') });
    renderWithProviders(<Directory />);
    expect(await screen.findByText('No alumni available')).toBeInTheDocument();
  });
});
