import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "primereact/button";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileImport, // Remplacement de faUsers par faFileImport
  faFolder,
  faChartBar,
  faEnvelope,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import "./UserSidebar.css";
import logo from "../../../assets/logo.png";

const UserSidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(-1);
  const fullText = "GEXPERTISE";
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!isSidebarOpen) {
      // Réinitialise seulement quand la sidebar se ferme
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const currentPath = location.pathname;
    const foundIndex = menuItems.findIndex((item) => item.path === currentPath);
    setActiveIndex(foundIndex);
  }, [location.pathname]);

  const handleItemClick = (index, path) => {
    setActiveIndex(index);
    navigate(path);
  };

  const handleOutsideClick = (event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const menuItems = [
    { icon: faFileImport, label: "Importation Fichiers", path: "/user-dashboard/importation-fichiers" }, // Icône mise à jour
    { icon: faFolder, label: "Calcul TA", path: "/user-dashboard/calcul-ta" },
    { icon: faChartBar, label: "Ressources", path: "/user-dashboard/ressources" },
    { icon: faEnvelope, label: "Contacter Nous", path: "/user-dashboard/contact" },
    { icon: faCog, label: "Paramètre de compte", path: "/user-dashboard/parametre_compte" },
  ];

  return (
    <div ref={sidebarRef} className={`sidebar ${isSidebarOpen ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        <Link to="/">
          <img src={logo} alt="Logo" className="sidebar-logo" />
        </Link>
        {isSidebarOpen && (
          <h1 className="sidebar-title">
            {fullText.split("").map((char, index) => (
              <span 
                key={index} 
                className="letter"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  display: 'inline-block'
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        )}
      </div>

      <Button
        icon={isSidebarOpen ? "pi pi-angle-left" : "pi pi-angle-right"}
        className="toggle-button"
        onClick={(e) => {
          e.stopPropagation();
          setIsSidebarOpen(!isSidebarOpen);
        }}
      />

      <ul className="menu-list">
        {menuItems.map((item, index) => (
          <li
            key={index}
            className={`menu-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => handleItemClick(index, item.path)}
          >
            <FontAwesomeIcon icon={item.icon} className="menu-icon" />
            {isSidebarOpen && <span className="menu-label">{item.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserSidebar;