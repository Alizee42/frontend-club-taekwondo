import { debounce } from './debounce';

describe('debounce', () => {
  it('doit exécuter la fonction une seule fois malgré plusieurs appels rapprochés', (done) => {
    let calls = 0;
    const fn = () => { calls++; };

    // On crée une version "debounced" de fn
    const d = debounce(fn, 50);

    d(); d(); d(); // plusieurs appels rapides

    setTimeout(() => {
      expect(calls).toBe(1); // ✅ doit être appelé une seule fois
      done();
    }, 80);
  });
});
