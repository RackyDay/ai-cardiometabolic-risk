import { useLocation } from "react-router-dom";

function useMenuBarViewModel() {
  const location = useLocation();

  const pageTitles = {
    "/": "",
    "/assessment": "Risk Assessment",
    "/inputs": "My Health Information",
    "/dashboard": "Overview",
    "/learn": "Learn",
    "/settings": "Account Settings",
  };

  const pageTitle = pageTitles[location.pathname] || "";

  return {
    pageTitle,
  };
}

export default useMenuBarViewModel;
