
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ScenarioSelection from './pages/ScenarioSelection';
import LiveControl from './pages/LiveControl';
import DeepAnalytics from './pages/DeepAnalytics';
import AgentDecision from './pages/AgentDecision';
import './index.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/scenarios" element={<ScenarioSelection />} />
                <Route path="/live" element={<LiveControl />} />
                <Route path="/analytics" element={<DeepAnalytics />} />
                <Route path="/decisions" element={<AgentDecision />} />
            </Routes>
        </Router>
    );
}

export default App;
