# Politique de Confidentialité - Ithaka

**Dernière mise à jour : 28 janvier 2025**
**Version : 1.0**

## 1. Identité du Responsable du Traitement

**Nom de l'application :** Ithaka
**Type de service :** Application web de carnets de voyage et journaux personnels
**Contact DPO (Data Protection Officer) :** privacy@ithaka-app.com

Conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679), cette politique de confidentialité vous informe sur la manière dont nous collectons, utilisons, stockons et protégeons vos données personnelles.

---

## 2. Types de Données Collectées

### 2.1 Données d'authentification et de profil

Lors de votre inscription et utilisation d'Ithaka, nous collectons les données suivantes :

| Donnée | Obligatoire | Finalité |
|--------|-------------|----------|
| Adresse e-mail | Oui | Authentification, communication de service |
| Mot de passe (hashé) | Oui | Sécurité du compte |
| Prénom | Non | Personnalisation de l'expérience |
| Nom | Non | Personnalisation de l'expérience |
| Photo de profil | Non | Personnalisation du profil |

**Note importante :** Votre mot de passe est haché avec bcrypt (10 salt rounds) et n'est jamais stocké en clair. Nous ne pouvons pas récupérer votre mot de passe, seulement vous permettre de le réinitialiser.

### 2.2 Données de contenu

Lorsque vous utilisez les fonctionnalités de création de carnets de voyage :

- Titres et descriptions de carnets
- Contenu des pages (textes, images, médias)
- Stickers et éléments visuels ajoutés
- Dates de création et de modification

### 2.3 Données techniques (cookies)

Nous utilisons des cookies strictement nécessaires pour l'authentification :

| Cookie | Type | Durée | Finalité |
|--------|------|-------|----------|
| accessToken | httpOnly, Secure, SameSite=Strict | 15 minutes | Authentification des requêtes API |
| refreshToken | httpOnly, Secure, SameSite=Strict | 7 jours | Renouvellement automatique de la session |

**Ces cookies sont essentiels au fonctionnement de l'application et ne peuvent pas être désactivés.**

### 2.4 Données que nous ne collectons PAS

Conformément à nos principes de minimisation des données :

- Nous ne collectons PAS votre adresse IP
- Nous ne collectons PAS de données de géolocalisation précise
- Nous ne collectons PAS de données de navigation (analytics, trackers tiers)
- Nous ne collectons PAS de données sensibles (origine raciale, opinions politiques, santé, etc.)

---

## 3. Finalités du Traitement

### 3.1 Base légale : Exécution du contrat (Art. 6.1.b RGPD)

Nous traitons vos données pour vous fournir le service Ithaka :

- **Gestion de votre compte** : création, authentification, modification de profil
- **Stockage de vos carnets** : sauvegarde et synchronisation de vos créations
- **Fonctionnalités de partage** : partage de carnets avec d'autres utilisateurs (avec votre consentement explicite)
- **Export PDF** : génération de vos carnets en format imprimable haute qualité (300 DPI)

### 3.2 Base légale : Intérêt légitime (Art. 6.1.f RGPD)

- **Sécurité du service** : prévention des abus, détection des fraudes, protection contre les cyberattaques
- **Amélioration du service** : correction de bugs, optimisation des performances

### 3.3 Base légale : Obligation légale (Art. 6.1.c RGPD)

- **Conservation des logs de sécurité** : en cas de litige ou de requête des autorités compétentes

---

## 4. Durée de Conservation des Données

| Type de données | Durée de conservation | Justification |
|-----------------|----------------------|---------------|
| Compte actif | Tant que le compte est actif | Exécution du contrat |
| Compte supprimé | Suppression immédiate | Droit à l'oubli (Art. 17 RGPD) |
| Logs de sécurité | 12 mois maximum | Intérêt légitime (sécurité) |
| Tokens de réinitialisation | 1 heure | Minimisation des risques |

**Important :** Lorsque vous supprimez votre compte, toutes vos données personnelles sont supprimées définitivement de nos serveurs dans un délai de 30 jours.

---

## 5. Destinataires des Données

### 5.1 Hébergement

Vos données sont hébergées sur des serveurs sécurisés. Nos sous-traitants sont contractuellement liés par des clauses de confidentialité et de conformité RGPD (Art. 28 RGPD).

**Localisation des serveurs :** Union Européenne (conformité RGPD complète)

### 5.2 Prestataires de services

- **Service d'envoi d'e-mails** : SendGrid (réinitialisation de mot de passe uniquement)
  - Localisation : USA (Clauses Contractuelles Types approuvées par la Commission Européenne)

### 5.3 Aucun partage commercial

Nous ne vendons, ne louons ni ne partageons vos données personnelles à des tiers à des fins commerciales ou marketing.

---

## 6. Transferts de Données Hors UE

Conformément à l'Art. 44-50 RGPD, nous limitons au maximum les transferts hors UE.

**SendGrid (USA) :** Nous utilisons des Clauses Contractuelles Types (CCT) approuvées par la Commission Européenne pour garantir un niveau de protection équivalent au RGPD.

---

## 7. Vos Droits GDPR

Conformément au RGPD, vous disposez des droits suivants :

### 7.1 Droit d'accès (Art. 15 RGPD)

Vous pouvez demander une copie de toutes les données personnelles que nous détenons sur vous.

**Comment exercer ce droit :** Utilisez la fonction "Exporter mes données" dans les paramètres de votre compte pour télécharger un fichier JSON contenant toutes vos informations.

### 7.2 Droit de rectification (Art. 16 RGPD)

Vous pouvez corriger ou mettre à jour vos données à tout moment.

**Comment exercer ce droit :** Allez dans "Mon profil" → "Modifier mes informations"

### 7.3 Droit à l'effacement / Droit à l'oubli (Art. 17 RGPD)

Vous pouvez demander la suppression complète de votre compte et de toutes vos données.

**Comment exercer ce droit :** Allez dans "Paramètres" → "Supprimer mon compte" → Confirmez avec votre mot de passe

**Important :** Cette action est irréversible. Toutes vos données (carnets, pages, profil) seront définitivement supprimées.

### 7.4 Droit à la portabilité (Art. 20 RGPD)

Vous avez le droit de récupérer vos données dans un format structuré, couramment utilisé et lisible par machine (JSON).

**Comment exercer ce droit :** Utilisez la fonction "Exporter mes données" dans les paramètres de votre compte.

### 7.5 Droit d'opposition (Art. 21 RGPD)

Vous pouvez vous opposer au traitement de vos données fondé sur notre intérêt légitime.

**Comment exercer ce droit :** Contactez privacy@ithaka-app.com

### 7.6 Droit de limitation (Art. 18 RGPD)

Vous pouvez demander la limitation du traitement de vos données dans certains cas.

**Comment exercer ce droit :** Contactez privacy@ithaka-app.com

### 7.7 Droit de retirer votre consentement (Art. 7.3 RGPD)

Si un traitement est fondé sur votre consentement, vous pouvez le retirer à tout moment.

**Comment exercer ce droit :** Désactivez les fonctionnalités concernées dans vos paramètres.

### 7.8 Droit d'introduire une réclamation

Vous avez le droit de déposer une plainte auprès de l'autorité de contrôle de votre pays :

- **France :** CNIL (www.cnil.fr)
- **Belgique :** APD (www.autoriteprotectiondonnees.be)
- **Liste complète UE :** https://edpb.europa.eu/about-edpb/board/members_en

---

## 8. Sécurité des Données

Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :

### 8.1 Mesures techniques

- **Chiffrement des mots de passe** : bcrypt avec 10 salt rounds (impossible de récupérer le mot de passe en clair)
- **JWT dans cookies httpOnly** : les tokens d'authentification ne sont pas accessibles via JavaScript (protection contre XSS)
- **Cookies Secure** : transmission uniquement via HTTPS
- **SameSite=Strict** : protection contre les attaques CSRF (Cross-Site Request Forgery)
- **HTTPS obligatoire** : toutes les communications sont chiffrées en transit (TLS 1.3)
- **Validation des entrées** : toutes les données utilisateur sont validées côté serveur (protection contre injection SQL, XSS)

### 8.2 Mesures organisationnelles

- **Principe de minimisation** : nous ne collectons que les données strictement nécessaires
- **Accès limité** : seuls les administrateurs autorisés ont accès aux bases de données
- **Logs d'audit** : toute suppression de compte est enregistrée pour traçabilité
- **Politique de mots de passe forts** : minimum 8 caractères avec complexité requise

### 8.3 En cas de violation de données (Data Breach)

Conformément à l'Art. 33 & 34 RGPD, en cas de violation de données présentant un risque pour vos droits et libertés :

1. Nous notifierons la CNIL dans les 72 heures
2. Nous vous informerons directement par e-mail
3. Nous prendrons des mesures immédiates pour limiter les dégâts

---

## 9. Cookies et Technologies Similaires

### 9.1 Cookies strictement nécessaires (exemptés de consentement - Art. 82 ePrivacy)

Nous utilisons uniquement des cookies essentiels au fonctionnement du service :

- **accessToken** : authentification des requêtes (durée : 15 minutes)
- **refreshToken** : renouvellement automatique de session (durée : 7 jours)

**Ces cookies sont exemptés de consentement car strictement nécessaires au service demandé.**

### 9.2 Cookies tiers

Nous n'utilisons AUCUN cookie tiers (Google Analytics, Facebook Pixel, etc.). Nous respectons votre vie privée et ne suivons pas votre navigation.

---

## 10. Protection des Mineurs

Ithaka n'est pas destiné aux enfants de moins de 16 ans (ou l'âge de consentement numérique dans votre pays).

Si vous avez moins de 16 ans, vous devez obtenir le consentement de vos parents ou tuteurs légaux avant de vous inscrire.

Si nous découvrons qu'un mineur de moins de 16 ans s'est inscrit sans consentement parental, nous supprimerons immédiatement son compte.

---

## 11. Modifications de cette Politique

Nous nous réservons le droit de modifier cette politique de confidentialité pour refléter :

- Les évolutions de la réglementation (RGPD, ePrivacy, etc.)
- Les nouvelles fonctionnalités d'Ithaka
- Les améliorations de nos pratiques de sécurité

**En cas de modification substantielle :**

1. Nous mettrons à jour la date "Dernière mise à jour" en haut de ce document
2. Nous vous notifierons par e-mail si le changement affecte significativement vos droits
3. Vous pourrez accepter ou refuser la nouvelle politique (refus = suppression du compte)

---

## 12. Contact et Questions

Pour toute question sur cette politique de confidentialité ou pour exercer vos droits GDPR :

**E-mail DPO :** privacy@ithaka-app.com
**Délai de réponse :** Nous nous engageons à répondre dans les 30 jours (conformément à l'Art. 12.3 RGPD)

---

## 13. Références Légales

Cette politique de confidentialité est conforme aux réglementations suivantes :

- **RGPD (Règlement UE 2016/679)** : Règlement Général sur la Protection des Données
- **Directive ePrivacy (2002/58/CE)** : Protection de la vie privée dans les communications électroniques
- **Loi Informatique et Libertés (France)** : Loi n°78-17 du 6 janvier 1978 modifiée

---

## 14. Résumé des Points Clés (TLDR)

✅ **Nous collectons le minimum de données** : email, nom, mot de passe (hashé), carnets de voyage
✅ **Vos données restent VÔTRES** : vous pouvez les exporter ou les supprimer à tout moment
✅ **Sécurité maximale** : JWT, bcrypt, HTTPS, cookies httpOnly
✅ **Aucun tracking publicitaire** : pas de Google Analytics, pas de Facebook Pixel
✅ **Hébergement EU** : vos données restent en Europe (RGPD compliant)
✅ **Droit à l'oubli** : suppression définitive de votre compte en un clic
✅ **Transparence totale** : cette politique est claire, complète et en français

**Notre philosophie :** Votre vie privée est sacrée. Nous ne monétisons jamais vos données.

---

**Date d'entrée en vigueur : 28 janvier 2025**

**Version : 1.0**
