import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Onboarding from './components/Onboarding.jsx';
import { ToastProvider } from './components/ui.jsx';
import HomePage from './pages/HomePage.jsx';
import LearnPage from './pages/LearnPage.jsx';
import LessonPage from './pages/LessonPage.jsx';
import TechPage from './pages/TechPage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import CampusPage from './pages/CampusPage.jsx';
import ScenarioPage from './pages/ScenarioPage.jsx';
import TutorPage from './pages/TutorPage.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Onboarding />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/:id" element={<LessonPage />} />
          <Route path="tech" element={<TechPage />} />
          <Route path="play" element={<PlayPage />} />
          <Route path="play/:mode" element={<QuizPage />} />
          <Route path="campus" element={<CampusPage />} />
          <Route path="campus/:id" element={<ScenarioPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
