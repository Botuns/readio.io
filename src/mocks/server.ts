import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node-side mock server used by the integration tests. */
export const server = setupServer(...handlers);
