import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { EmptyState, LoadingBlock } from "./components/shared";
import { LearnerProvider } from "./hooks/useLearner";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then(({ DashboardPage: Page }) => ({ default: Page })));
const CurriculumPage = lazy(() => import("./pages/CurriculumPage").then(({ CurriculumPage: Page }) => ({ default: Page })));
const QuestionBankPage = lazy(() => import("./pages/QuestionBankPage").then(({ QuestionBankPage: Page }) => ({ default: Page })));
const PracticePage = lazy(() => import("./pages/PracticePage").then(({ PracticePage: Page }) => ({ default: Page })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then(({ ProgressPage: Page }) => ({ default: Page })));

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    const title = location.pathname.startsWith("/curriculum")
      ? "Curriculum"
      : location.pathname.startsWith("/questions/")
        ? "Practice"
        : location.pathname.startsWith("/questions")
          ? "Question bank"
          : location.pathname.startsWith("/progress")
            ? "My progress"
            : "Dashboard";
    document.title = `${title} · Interview Architect`;
  }, [location.pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  return null;
}

function NotFoundPage() {
  return <div className="page-enter"><EmptyState icon="compass" title="This path is not on the study map" description="Head back to your workspace to pick up a useful prompt." actionTo="/" actionLabel="Go to dashboard" /></div>;
}

function RoutedApplication() {
  return (
    <Suspense fallback={<div className="app-route-loading"><LoadingBlock label="Loading your study space" /></div>}>
      <RouteEffects />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="curriculum" element={<CurriculumPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="questions/:slug" element={<PracticePage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <LearnerProvider>
      <BrowserRouter>
        <RoutedApplication />
      </BrowserRouter>
    </LearnerProvider>
  );
}
