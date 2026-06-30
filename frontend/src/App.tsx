import { Suspense, lazy } from "react";

const Magazine = lazy(() => import("./components/Magazine"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Magazine />
    </Suspense>
  );
}
