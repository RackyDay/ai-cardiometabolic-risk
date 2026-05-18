import { useLocation } from "react-router-dom";

// Logic for hiding navbar on specific pages
function useAppLayoutViewModel() {
  const location = useLocation();

  const pagesWithoutSideNav = ["/"];
  const shouldShowSideNav = !pagesWithoutSideNav.includes(location.pathname);

  return {
    shouldShowSideNav,
  };
}

export default useAppLayoutViewModel;