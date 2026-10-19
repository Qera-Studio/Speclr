import { render } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger } from '../tabs';

/**
 * The pill is the strip's, not the caller's. It used to be a separate part each
 * screen had to add, four of six did not, and their drag moved nothing.
 */
describe('TabsList', () => {
  const strip = (props: React.ComponentProps<typeof TabsList> = {}) =>
    render(
      <Tabs defaultValue="a">
        <TabsList {...props}>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    ).container;

  it('draws its own pill, once, with nothing asked of the caller', () => {
    expect(strip().querySelectorAll('[data-slot="tabs-indicator"]')).toHaveLength(1);
  });

  it('draws no pill on an underline strip', () => {
    expect(strip({ variant: 'line' }).querySelectorAll('[data-slot="tabs-indicator"]')).toHaveLength(0);
  });

  it('takes the button heights and defaults to the middle one', () => {
    expect(strip().querySelector('[data-slot="tabs-list"]')).toHaveAttribute('data-size', 'md');
    expect(strip({ size: 'lg' }).querySelector('[data-slot="tabs-list"]')).toHaveAttribute('data-size', 'lg');
  });
});
