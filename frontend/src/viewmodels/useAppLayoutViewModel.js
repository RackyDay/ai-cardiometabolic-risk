import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
 
function useAppLayoutViewModel() {
  const location = useLocation();

  const pagesWithoutSideNav = ["/", "/inputs"];
  const shouldShowSideNav = !pagesWithoutSideNav.includes(location.pathname);

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  const openSideNav = () => setIsSideNavOpen(true);
  const closeSideNav = () => setIsSideNavOpen(false);
  const toggleSideNav = () => setIsSideNavOpen((current) => !current);

  useEffect(() => {
    closeSideNav();
  }, [location.pathname]);

  return {
    shouldShowSideNav,
    isSideNavOpen,
    openSideNav,
    closeSideNav,
    toggleSideNav,
  };
}
 
export default useAppLayoutViewModel;
 