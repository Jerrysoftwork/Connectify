import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Feed from "./pages/Feed";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default page is Login */}
        <Route path="/" element={<Login />} />
        <Route path="/feed" element={<Feed />} />
      </Routes>
    </Router>
  );
}

export default App;
