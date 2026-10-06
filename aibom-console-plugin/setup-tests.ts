import { TextDecoder, TextEncoder } from 'util';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// jsdom doesn't implement these; react-router's ESM build references
// TextEncoder at import time.
Object.assign(globalThis, { TextEncoder, TextDecoder });

configure({ testIdAttribute: 'data-test' });
