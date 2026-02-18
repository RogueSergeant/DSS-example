import './App.css';
import { HatchPatternDefs } from './components/HatchPattern';

/**
 * App shell — renders the global SVG hatch pattern definitions
 * and provides the entry point for page composition (Brief 4).
 *
 * Individual dashboard pages will be added in Brief 4.
 */

function App() {
  return (
    <>
      {/* Global SVG defs for hatch patterns — referenced via url(#hatch-loss) */}
      <HatchPatternDefs />
    </>
  );
}

export default App;
