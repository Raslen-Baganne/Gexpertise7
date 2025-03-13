import React, { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import UserHeader from "../../UserHeader/UserHeader";

import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./parametre_compte.css";

const DashboardParametreCompte = () => {
  const [selectedKey, setSelectedKey] = useState("1");

  return (
    <div className="parametre-compte-container">
      <UserHeader />
      <div className="parametre-compte-content">
        <div className="parametre-navigation">
          <Button 
            className={`nav-button ${selectedKey === "1" ? "active" : ""}`}
            onClick={() => setSelectedKey("1")}
            icon="pi pi-user"
            label="Profil"
          />
          <Button 
            className={`nav-button ${selectedKey === "2" ? "active" : ""}`}
            onClick={() => setSelectedKey("2")}
            icon="pi pi-cog"
            label="Paramètres"
          />
          <Button 
            className={`nav-button ${selectedKey === "3" ? "active" : ""}`}
            onClick={() => setSelectedKey("3")}
            icon="pi pi-lock"
            label="Sécurité"
          />
        </div>
        <div className="parametre-content">
          {selectedKey === "1" && (
            <Card title="👤 Informations du Profil" className="p-shadow-4">
              <div className="p-fluid">
                <div className="p-field">
                  <label htmlFor="name">Nom complet :</label>
                  <InputText id="name" placeholder="Entrez votre nom complet" />
                </div>
                <div className="p-field">
                  <label htmlFor="email">Adresse e-mail :</label>
                  <InputText id="email" placeholder="exemple@domaine.com" />
                </div>
                <Button 
                  label="Mettre à jour" 
                  className="p-mt-3 p-button-primary custom-button" 
                  icon="pi pi-check" 
                />
              </div>
            </Card>
          )}
          {selectedKey === "2" && (
            <Card title="⚙️ Paramètres de Compte" className="p-shadow-4">
              <div className="p-fluid">
                <div className="p-field">
                  <label htmlFor="language">Langue préférée :</label>
                  <InputText id="language" placeholder="Ex: Français, Anglais..." />
                </div>
                <div className="p-field">
                  <label htmlFor="timezone">Fuseau horaire :</label>
                  <InputText id="timezone" placeholder="Ex: UTC+1, UTC-5..." />
                </div>
                <Button 
                  label="Enregistrer les modifications" 
                  className="p-mt-3 p-button-success custom-button" 
                  icon="pi pi-save" 
                />
              </div>
            </Card>
          )}
          {selectedKey === "3" && (
            <Card title="🔒 Sécurité" className="p-shadow-4">
              <div className="p-fluid">
                <div className="p-field">
                  <label htmlFor="currentPassword">Mot de passe actuel :</label>
                  <Password id="currentPassword" placeholder="********" feedback={false} />
                </div>
                <div className="p-field">
                  <label htmlFor="newPassword">Nouveau mot de passe :</label>
                  <Password id="newPassword" placeholder="********" />
                </div>
                <Button 
                  label="Changer le mot de passe" 
                  className="p-mt-3 p-button-danger custom-button" 
                  icon="pi pi-lock" 
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardParametreCompte;