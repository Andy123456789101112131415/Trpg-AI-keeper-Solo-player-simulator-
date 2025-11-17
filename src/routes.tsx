import Home from './pages/Home';
import CharacterCreate from './pages/CharacterCreate';
import ScenarioSelect from './pages/ScenarioSelect';
import Game from './pages/Game';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <Home />
  },
  {
    name: 'Character Create',
    path: '/character/create',
    element: <CharacterCreate />
  },
  {
    name: 'Scenario Select',
    path: '/scenario/select',
    element: <ScenarioSelect />
  },
  {
    name: 'Game',
    path: '/game/:scenarioId',
    element: <Game />
  }
];

export default routes;