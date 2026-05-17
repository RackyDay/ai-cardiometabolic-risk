import { useLocation } from "react-router-dom";

function useMenuBarViewModel() {
  const location = useLocation();

  const pageTitles = {
    "/": "Assessment",
    "/dashboard": "Dashboard",
    "/learn": "Learn",
  };

  const pageTitle = pageTitles[location.pathname] || "Assessment";

  return {
    pageTitle,
  };
}

export default useMenuBarViewModel;