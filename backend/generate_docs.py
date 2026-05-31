#!/usr/bin/env python3
"""Generate TaxiG complete documentation PDF"""
from fpdf import FPDF
import os

class TaxiGDoc(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)
    
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, 'TaxiG - Documentation Officielle', align='L')
            self.cell(0, 8, f'Page {self.page_no()}', align='R', new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(255, 107, 0)
            self.line(10, 16, 200, 16)
            self.ln(4)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, 'Document confidentiel - TaxiG Platform', align='C')
    
    def title_page(self):
        self.add_page()
        self.ln(40)
        self.set_font('Helvetica', 'B', 36)
        self.set_text_color(10, 22, 40)
        self.cell(0, 20, 'TaxiG', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', '', 16)
        self.set_text_color(255, 107, 0)
        self.cell(0, 12, 'Documentation Complete', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_draw_color(255, 107, 0)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, 'Guide d\'utilisation pour Administrateurs et Chauffeurs', align='C', new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, 'Architecture technique et documentation API', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(30)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 7, 'Version 2.0 - Avril 2026', align='C', new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, 'Plateforme de taxi professionnelle', align='C', new_x="LMARGIN", new_y="NEXT")
    
    def section_title(self, title, level=1):
        self.ln(6)
        self.set_x(10)
        if level == 1:
            self.set_font('Helvetica', 'B', 18)
            self.set_text_color(10, 22, 40)
            self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(255, 107, 0)
            self.set_line_width(0.8)
            self.line(10, self.get_y(), 80, self.get_y())
            self.set_line_width(0.2)
        elif level == 2:
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(26, 51, 88)
            self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_font('Helvetica', 'B', 11)
            self.set_text_color(255, 107, 0)
            self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
    
    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 6, text)
        self.ln(2)
    
    def bullet(self, text, indent=10):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10 + indent)
        self.set_text_color(255, 107, 0)
        self.cell(5, 6, '-')
        self.set_text_color(50, 50, 50)
        self.multi_cell(175 - indent, 6, text)
    
    def info_box(self, title, content):
        self.set_fill_color(240, 245, 255)
        self.set_draw_color(26, 51, 88)
        y_start = self.get_y()
        self.rect(10, y_start, 190, 25, style='DF')
        self.set_xy(15, y_start + 3)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(26, 51, 88)
        self.cell(180, 6, title)
        self.set_xy(15, y_start + 11)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(80, 80, 80)
        self.cell(180, 6, content)
        self.set_xy(10, y_start + 28)

    def table_row(self, cols, widths, bold=False, header=False):
        self.set_x(10)
        if header:
            self.set_fill_color(10, 22, 40)
            self.set_text_color(255, 255, 255)
            self.set_font('Helvetica', 'B', 9)
        elif bold:
            self.set_fill_color(245, 247, 250)
            self.set_text_color(30, 30, 30)
            self.set_font('Helvetica', 'B', 9)
        else:
            self.set_fill_color(255, 255, 255)
            self.set_text_color(50, 50, 50)
            self.set_font('Helvetica', '', 9)
        
        for i, (col, w) in enumerate(zip(cols, widths)):
            self.cell(w, 8, str(col), border=1, fill=True)
        self.ln()


def generate_doc():
    pdf = TaxiGDoc()
    
    # ==================== TITLE PAGE ====================
    pdf.title_page()
    
    # ==================== TABLE DES MATIERES ====================
    pdf.add_page()
    pdf.section_title('Table des matieres', 1)
    toc = [
        ('1. Presentation generale', '3'),
        ('2. Architecture technique', '4'),
        ('3. Guide Administrateur', '6'),
        ('   3.1 Connexion', '6'),
        ('   3.2 Tableau de bord', '6'),
        ('   3.3 Gestion des chauffeurs', '7'),
        ('   3.4 Gestion des clients', '8'),
        ('   3.5 Suivi des courses', '8'),
        ('   3.6 Revenus et commissions', '9'),
        ('   3.7 Verification des documents', '9'),
        ('4. Guide Chauffeur', '10'),
        ('   4.1 Connexion', '10'),
        ('   4.2 Demarrage du service', '10'),
        ('   4.3 Reception des courses', '11'),
        ('   4.4 Deroulement d\'une course', '12'),
        ('   4.5 Chat avec le client', '13'),
        ('   4.6 Mes commandes', '13'),
        ('   4.7 Mes revenus et export PDF', '14'),
        ('   4.8 Calendrier d\'indisponibilites', '14'),
        ('   4.9 Envoi de documents', '15'),
        ('5. Guide Client', '16'),
        ('6. Tarification', '17'),
        ('7. API Reference', '18'),
        ('8. Securite et RGPD', '20'),
    ]
    for item, page in toc:
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(50, 50, 50)
        dots = '.' * (60 - len(item))
        pdf.cell(0, 7, f'{item} {dots} {page}', new_x="LMARGIN", new_y="NEXT")
    
    # ==================== 1. PRESENTATION ====================
    pdf.add_page()
    pdf.section_title('1. Presentation generale', 1)
    pdf.body_text('TaxiG est une plateforme de taxi professionnelle complete qui connecte les clients, les chauffeurs et les administrateurs via une application web moderne. L\'application permet la reservation de courses en temps reel, le suivi GPS, le chat entre client et chauffeur, et la gestion complete de la flotte.')
    
    pdf.section_title('Fonctionnalites principales', 2)
    features = [
        'Reservation de course en temps reel avec estimation de prix transparente',
        'Geolocalisation et suivi GPS via OpenStreetMap (carte interactive)',
        'Chat en temps reel entre client et chauffeur pendant la course',
        'Notifications push navigateur pour les chauffeurs (nouvelles courses)',
        'Systeme de notation 5 etoiles bidirectionnel (client/chauffeur)',
        'Export PDF des revenus pour la comptabilite des chauffeurs',
        'Upload et verification de documents (permis, identite)',
        'Tableau de bord administrateur avec statistiques completes',
        'Roulette promotionnelle avec codes promo pour les clients',
        'Calendrier de gestion des indisponibilites des chauffeurs',
    ]
    for f in features:
        pdf.bullet(f)
    
    pdf.ln(5)
    pdf.section_title('Utilisateurs de la plateforme', 2)
    pdf.body_text('La plateforme gere trois types d\'utilisateurs :')
    pdf.bullet('Client : Reserve des courses, suit le trajet, note le chauffeur, chatte en temps reel')
    pdf.bullet('Chauffeur : Recoit les demandes, navigue vers le client, gere ses revenus et documents')
    pdf.bullet('Administrateur : Supervise la plateforme, gere les chauffeurs/clients, verifie les documents')
    
    # ==================== 2. ARCHITECTURE ====================
    pdf.add_page()
    pdf.section_title('2. Architecture technique', 1)
    
    pdf.section_title('Stack technologique', 2)
    pdf.body_text('L\'application utilise une architecture client-serveur moderne :')
    
    cols_w = [50, 140]
    pdf.table_row(['Composant', 'Technologie'], cols_w, header=True)
    pdf.table_row(['Frontend', 'React 18 + Tailwind CSS + Shadcn/UI'], cols_w)
    pdf.table_row(['Backend', 'FastAPI (Python) + Motor (async MongoDB)'], cols_w)
    pdf.table_row(['Base de donnees', 'MongoDB (base: taxi)'], cols_w)
    pdf.table_row(['Cartographie', 'OpenStreetMap + Leaflet + OSRM (routing)'], cols_w)
    pdf.table_row(['Geocodage', 'Nominatim (OpenStreetMap) - gratuit, illimite'], cols_w)
    pdf.table_row(['Authentification', 'JWT (JSON Web Tokens) - validite 7 jours'], cols_w)
    pdf.table_row(['Chat', 'REST API avec polling 2s (temps reel)'], cols_w)
    pdf.table_row(['Notifications', 'Web Notifications API (push navigateur)'], cols_w)
    pdf.table_row(['PDF Export', 'jsPDF + jspdf-autotable (cote client)'], cols_w)
    
    pdf.ln(5)
    pdf.section_title('Collections MongoDB', 2)
    cols_w2 = [45, 145]
    pdf.table_row(['Collection', 'Description'], cols_w2, header=True)
    pdf.table_row(['clients', 'Comptes clients (email, mot de passe, promo codes)'], cols_w2)
    pdf.table_row(['chauffeurs', 'Comptes chauffeurs (code, position GPS, statut en ligne)'], cols_w2)
    pdf.table_row(['admins', 'Comptes administrateurs'], cols_w2)
    pdf.table_row(['client_commandes', 'Courses reservees (statut, prix, chauffeur assigne)'], cols_w2)
    pdf.table_row(['course_requests', 'Demandes de course envoyees aux chauffeurs'], cols_w2)
    pdf.table_row(['chauffeur_commandes', 'Vue chauffeur des commandes acceptees'], cols_w2)
    pdf.table_row(['chat_messages', 'Messages du chat client/chauffeur'], cols_w2)
    pdf.table_row(['ratings', 'Notes 1-5 etoiles + commentaires'], cols_w2)
    pdf.table_row(['chauffeur_documents', 'Documents uploades (permis, identite)'], cols_w2)
    pdf.table_row(['pointages', 'Historique des connexions/deconnexions chauffeurs'], cols_w2)
    pdf.table_row(['chauffeur_revenus', 'Revenus calcules des chauffeurs (30 jours)'], cols_w2)
    
    pdf.ln(5)
    pdf.section_title('Flux de reservation d\'une course', 2)
    steps = [
        '1. Le client saisit l\'adresse de depart et de destination',
        '2. Le systeme calcule la distance (OSRM) et estime le prix',
        '3. Le client confirme la reservation',
        '4. Le backend trouve le chauffeur EN LIGNE le plus proche (calcul Haversine)',
        '5. Une demande est envoyee au chauffeur (notification push + polling 3s)',
        '6. Le chauffeur accepte ou refuse (si refuse, le suivant est contacte)',
        '7. Le chauffeur navigue vers le client (route calculee par OSRM)',
        '8. Le chauffeur demarre la course -> chat disponible',
        '9. Le chauffeur termine la course -> prix final calcule',
        '10. Les deux parties peuvent se noter (1-5 etoiles)',
    ]
    for s in steps:
        pdf.bullet(s, indent=5)
    
    # ==================== 3. GUIDE ADMIN ====================
    pdf.add_page()
    pdf.section_title('3. Guide Administrateur', 1)
    
    pdf.section_title('3.1 Connexion', 2)
    pdf.body_text('Pour acceder au tableau de bord administrateur :')
    pdf.bullet('Rendez-vous sur la page d\'accueil de TaxiG')
    pdf.bullet('Cliquez sur "Admin" en haut a droite de la page')
    pdf.bullet('Entrez votre identifiant et mot de passe')
    pdf.bullet('Cliquez sur "SE CONNECTER"')
    pdf.ln(3)
    pdf.info_box('Identifiants par defaut', 'Utilisateur : naim  |  Mot de passe : admin123')
    
    pdf.ln(5)
    pdf.section_title('3.2 Tableau de bord', 2)
    pdf.body_text('Le tableau de bord affiche en temps reel les indicateurs cles de votre plateforme :')
    
    cols_w3 = [50, 140]
    pdf.table_row(['Indicateur', 'Description'], cols_w3, header=True)
    pdf.table_row(['Chauffeurs', 'Nombre total + nombre actuellement en ligne'], cols_w3)
    pdf.table_row(['Clients', 'Nombre total de clients inscrits'], cols_w3)
    pdf.table_row(['Courses', 'Nombre total de courses + courses terminees'], cols_w3)
    pdf.table_row(['Revenus totaux', 'Chiffre d\'affaires total + commission TaxiG (15%)'], cols_w3)
    
    pdf.ln(3)
    pdf.body_text('La section "Activite recente des chauffeurs" affiche les derniers pointages (debut/fin de service) avec l\'heure et le nom du chauffeur.')
    
    pdf.section_title('3.3 Gestion des chauffeurs', 2)
    pdf.body_text('Accessible via le menu lateral > "Chauffeurs". Cette vue permet de :')
    pdf.bullet('Voir la liste complete des chauffeurs avec leur statut (en ligne/hors ligne)')
    pdf.bullet('Voir le nombre de courses effectuees et la note moyenne')
    pdf.bullet('Consulter les revenus des 30 derniers jours')
    pdf.bullet('Ajouter un nouveau chauffeur (bouton + en haut a droite)')
    pdf.bullet('Consulter les documents d\'un chauffeur (icone oeil)')
    pdf.bullet('Ajouter un rapport/note sur un chauffeur (icone document)')
    pdf.bullet('Supprimer un chauffeur (icone corbeille)')
    
    pdf.ln(3)
    pdf.section_title('Ajouter un chauffeur', 3)
    pdf.body_text('Pour ajouter un nouveau chauffeur, cliquez sur le bouton "+" et remplissez :')
    pdf.bullet('Nom et Prenom du chauffeur')
    pdf.bullet('Email professionnel')
    pdf.bullet('Code chauffeur unique (ex: TAXI002) - c\'est son identifiant de connexion')
    pdf.bullet('Mot de passe initial')
    pdf.body_text('Le chauffeur pourra ensuite se connecter avec son code et son mot de passe.')
    
    pdf.add_page()
    pdf.section_title('3.4 Gestion des clients', 2)
    pdf.body_text('Accessible via le menu lateral > "Clients". Cette vue affiche :')
    pdf.bullet('Liste de tous les clients inscrits')
    pdf.bullet('Email et mode de paiement prefere')
    pdf.bullet('Nombre de courses effectuees')
    pdf.bullet('Date d\'inscription')
    
    pdf.section_title('3.5 Suivi des courses', 2)
    pdf.body_text('Accessible via le menu lateral > "Courses". Permet de suivre toutes les courses :')
    pdf.bullet('Filtrage par statut : En attente, Assignee, En cours, Terminee, Annulee')
    pdf.bullet('Details complets : client, chauffeur, adresses, prix estime et final')
    pdf.bullet('Date et heure de chaque course')
    pdf.bullet('Methode de paiement utilisee')
    
    pdf.ln(3)
    pdf.section_title('Statuts des courses', 3)
    cols_s = [35, 155]
    pdf.table_row(['Statut', 'Description'], cols_s, header=True)
    pdf.table_row(['pending', 'Course en attente d\'un chauffeur disponible'], cols_s)
    pdf.table_row(['assigned', 'Chauffeur attribue, en route vers le client'], cols_s)
    pdf.table_row(['in_progress', 'Course en cours (client recupere)'], cols_s)
    pdf.table_row(['completed', 'Course terminee, prix final calcule'], cols_s)
    pdf.table_row(['cancelled', 'Course annulee par le client'], cols_s)
    
    pdf.section_title('3.6 Revenus et commissions', 2)
    pdf.body_text('Accessible via "Revenus". Affiche les revenus par periode (7j, 30j, 1 an) :')
    pdf.bullet('Revenus totaux de la plateforme')
    pdf.bullet('Commission TaxiG (15% sur chaque course)')
    pdf.bullet('Nombre de courses completees')
    pdf.bullet('Ventilation quotidienne des revenus')
    
    pdf.section_title('3.7 Verification des documents', 2)
    pdf.body_text('Les chauffeurs peuvent envoyer leurs documents (permis de conduire, permis de sejour, piece d\'identite). L\'administrateur peut :')
    pdf.bullet('Cliquer sur l\'icone "oeil" a cote d\'un chauffeur dans la liste')
    pdf.bullet('Voir les documents envoyes avec leur statut (En attente / Valide / Refuse)')
    pdf.bullet('Cliquer "Valider" pour approuver un document')
    pdf.bullet('Cliquer "Refuser" pour rejeter un document non conforme')
    
    # ==================== 4. GUIDE CHAUFFEUR ====================
    pdf.add_page()
    pdf.section_title('4. Guide Chauffeur', 1)
    
    pdf.section_title('4.1 Connexion', 2)
    pdf.body_text('Pour vous connecter a l\'espace chauffeur :')
    pdf.bullet('Rendez-vous sur la page d\'accueil de TaxiG')
    pdf.bullet('Cliquez sur "Je suis chauffeur"')
    pdf.bullet('Entrez votre Code Chauffeur (fourni par l\'administration)')
    pdf.bullet('Entrez votre mot de passe')
    pdf.bullet('Cliquez sur "SE CONNECTER"')
    pdf.ln(3)
    pdf.info_box('Important', 'Votre code chauffeur est unique (ex: TAXI001). Il vous est attribue par l\'administrateur lors de votre inscription. Contactez l\'administration si vous n\'avez pas vos identifiants.')
    
    pdf.ln(5)
    pdf.section_title('4.2 Demarrage du service', 2)
    pdf.body_text('Apres connexion, vous arrivez sur la carte. Pour commencer a recevoir des courses :')
    pdf.bullet('Cliquez sur l\'icone POWER (en haut a droite) pour passer "En service"')
    pdf.bullet('La barre de statut passe au vert avec "En service"')
    pdf.bullet('Votre position GPS est activee et transmise en temps reel')
    pdf.bullet('Le navigateur vous demande d\'autoriser les notifications - ACCEPTEZ pour etre alerte')
    pdf.ln(3)
    pdf.info_box('Geolocalisation requise', 'Vous devez autoriser la geolocalisation dans votre navigateur pour utiliser l\'application. Sans cela, les clients ne pourront pas vous localiser.')
    
    pdf.ln(5)
    pdf.section_title('4.3 Reception des courses', 2)
    pdf.body_text('Lorsqu\'un client reserve une course pres de vous :')
    pdf.bullet('Une notification push navigateur s\'affiche (meme si l\'onglet est en arriere-plan)')
    pdf.bullet('Un son de notification retentit')
    pdf.bullet('Un dialogue s\'ouvre avec les details de la course :')
    pdf.body_text('   - Prix estime de la course\n   - Adresse de prise en charge\n   - Adresse de destination\n   - Nom du client')
    pdf.bullet('Vous pouvez ACCEPTER ou REFUSER la course')
    pdf.bullet('Si vous refusez, la demande est envoyee au chauffeur disponible suivant')
    pdf.ln(3)
    pdf.info_box('Astuce', 'Les notifications push fonctionnent meme quand l\'onglet TaxiG est en arriere-plan. Gardez-le ouvert dans un onglet de votre navigateur pour ne manquer aucune course.')
    
    pdf.add_page()
    pdf.section_title('4.4 Deroulement d\'une course', 2)
    pdf.body_text('Apres avoir accepte une course, le processus est le suivant :')
    
    pdf.section_title('Phase 1 : Vers le client', 3)
    pdf.bullet('La carte affiche l\'itineraire vers le point de prise en charge (ligne bleue)')
    pdf.bullet('La barre d\'info montre : distance restante, temps estime, ETA')
    pdf.bullet('Le chronometre se lance automatiquement')
    pdf.bullet('Vous pouvez chatter avec le client via le bouton chat')
    
    pdf.section_title('Phase 2 : Client recupere', 3)
    pdf.bullet('Quand vous arrivez au point de prise en charge, cliquez "CLIENT RECUPERE - DEMARRER"')
    pdf.bullet('La carte recalcule l\'itineraire vers la destination')
    pdf.bullet('Le statut passe a "En course"')
    
    pdf.section_title('Phase 3 : Arrivee a destination', 3)
    pdf.bullet('Cliquez "TERMINER LA COURSE" quand vous etes arrive')
    pdf.bullet('Le prix final est calcule automatiquement')
    pdf.bullet('Un dialogue de notation s\'ouvre pour noter le client (1-5 etoiles)')
    
    pdf.section_title('4.5 Chat avec le client', 2)
    pdf.body_text('Pendant une course active, vous pouvez communiquer avec le client :')
    pdf.bullet('Cliquez sur l\'icone de message (bulle orange) dans le panneau de course')
    pdf.bullet('Le chat s\'ouvre en plein ecran')
    pdf.bullet('Tapez votre message et appuyez sur Entree ou le bouton d\'envoi')
    pdf.bullet('Les messages du client apparaissent a gauche (bleu marine)')
    pdf.bullet('Vos messages apparaissent a droite (orange)')
    pdf.bullet('Un badge rouge indique le nombre de messages non lus')
    pdf.bullet('Cliquez X pour fermer le chat et revenir a la carte')
    
    pdf.section_title('4.6 Mes commandes', 2)
    pdf.body_text('Accessible via le menu lateral (icone hamburger > "Mes commandes") :')
    pdf.bullet('Historique complet de vos courses')
    pdf.bullet('Filtrage : Toutes / Terminees / Assignees')
    pdf.bullet('Details : numero de commande, client, prix, date')
    
    pdf.add_page()
    pdf.section_title('4.7 Mes revenus et export PDF', 2)
    pdf.body_text('Accessible via "Mes revenus" dans le menu lateral :')
    pdf.bullet('Revenus brut des 30 derniers jours')
    pdf.bullet('Revenus net (apres commission TaxiG de 15%)')
    pdf.bullet('Montant de la commission due')
    pdf.bullet('Nombre de courses effectuees')
    pdf.bullet('Liste des dernieres courses completees avec montants')
    pdf.ln(3)
    pdf.section_title('Export PDF pour la comptabilite', 3)
    pdf.body_text('Cliquez sur "Telecharger PDF" pour generer un rapport complet contenant :')
    pdf.bullet('Vos informations personnelles (nom, code chauffeur)')
    pdf.bullet('Resume financier detaille (brut, commission, net)')
    pdf.bullet('Liste de toutes les courses avec dates et montants')
    pdf.bullet('Mise en page professionnelle avec en-tete TaxiG')
    pdf.body_text('Ce document peut etre transmis directement a votre comptable.')
    
    pdf.section_title('4.8 Calendrier d\'indisponibilites', 2)
    pdf.body_text('Accessible via "Calendrier" dans le menu lateral :')
    pdf.bullet('Cliquez sur une date pour indiquer une indisponibilite')
    pdf.bullet('Les dates selectionnees apparaissent en surbrillance')
    pdf.bullet('Re-cliquez sur une date pour la rendre disponible')
    pdf.bullet('L\'administration peut consulter vos indisponibilites')
    
    pdf.section_title('4.9 Envoi de documents', 2)
    pdf.body_text('Accessible via "Mes documents" dans le menu lateral. Vous pouvez envoyer :')
    pdf.bullet('Permis de conduire (obligatoire)')
    pdf.bullet('Permis de sejour')
    pdf.bullet('Piece d\'identite')
    pdf.ln(2)
    pdf.body_text('Formats acceptes : JPG, PNG, PDF (maximum 5 Mo par fichier)')
    pdf.body_text('Apres envoi, le document passe en statut "En attente" jusqu\'a ce que l\'administrateur le valide ou le refuse.')
    
    cols_d = [40, 50, 100]
    pdf.table_row(['Statut', 'Couleur', 'Signification'], cols_d, header=True)
    pdf.table_row(['En attente', 'Jaune', 'Document en cours de verification'], cols_d)
    pdf.table_row(['Valide', 'Vert', 'Document approuve par l\'administration'], cols_d)
    pdf.table_row(['Refuse', 'Rouge', 'Document refuse - veuillez renvoyer'], cols_d)
    
    # ==================== 5. GUIDE CLIENT ====================
    pdf.add_page()
    pdf.section_title('5. Guide Client (Resume)', 1)
    pdf.body_text('Le client accede a TaxiG via le bouton "JE SUIS CLIENT" sur la page d\'accueil.')
    
    pdf.section_title('Inscription et connexion', 2)
    pdf.bullet('Inscription avec nom, prenom, email et mot de passe')
    pdf.bullet('Connexion avec email et mot de passe')
    
    pdf.section_title('Commander une course', 2)
    pdf.bullet('La carte affiche votre position et les chauffeurs disponibles en temps reel')
    pdf.bullet('Saisissez l\'adresse de destination (autocompletion Nominatim)')
    pdf.bullet('Consultez l\'estimation de prix')
    pdf.bullet('Choisissez le mode de paiement (Especes ou Carte)')
    pdf.bullet('Confirmez la reservation')
    pdf.bullet('Suivez votre chauffeur sur la carte en temps reel')
    pdf.bullet('Chattez avec votre chauffeur pendant la course')
    pdf.bullet('Notez votre chauffeur a la fin de la course')
    
    pdf.section_title('Fonctionnalites supplementaires', 2)
    pdf.bullet('Historique : consultez vos courses passees avec prix et details')
    pdf.bullet('Statistiques : total depense, km parcourus, economies vs concurrence')
    pdf.bullet('Roulette TaxiG : tentez de gagner un code promo (1 essai/jour)')
    
    # ==================== 6. TARIFICATION ====================
    pdf.section_title('6. Tarification', 1)
    pdf.body_text('La tarification TaxiG est transparente et basee sur la distance parcourue :')
    
    cols_t = [80, 50, 60]
    pdf.table_row(['Element', 'Tarif', 'Details'], cols_t, header=True)
    pdf.table_row(['Prix de base', '6.30 EUR', 'Prise en charge fixe'], cols_t)
    pdf.table_row(['Prix au kilometre', '3.20 EUR/km', 'Distance calculee par OSRM'], cols_t)
    pdf.table_row(['Attente trafic', '0.50 EUR/min', '~10% du temps de trajet'], cols_t)
    pdf.table_row(['Attente client', '0.70 EUR/min', 'Si le client fait attendre'], cols_t)
    pdf.table_row(['Commission TaxiG', '15%', 'Prelevee sur chaque course'], cols_t)
    
    pdf.ln(5)
    pdf.section_title('Exemple de calcul', 3)
    pdf.body_text('Course de 5 km, duree estimee 12 minutes :\n- Base : 6.30 EUR\n- Distance : 5 x 3.20 = 16.00 EUR\n- Attente trafic : 1.2 x 0.50 = 0.60 EUR\n- Total : 22.90 EUR\n- Commission TaxiG : 3.44 EUR\n- Revenu chauffeur : 19.47 EUR')
    
    # ==================== 7. API ====================
    pdf.add_page()
    pdf.section_title('7. Reference API', 1)
    pdf.body_text('Toutes les routes API sont prefixees par /api. Authentification via header "Authorization: Bearer <token>".')
    
    pdf.section_title('Authentification', 2)
    cols_a = [30, 70, 90]
    pdf.table_row(['Methode', 'Endpoint', 'Description'], cols_a, header=True)
    pdf.table_row(['POST', '/api/client/register', 'Inscription client'], cols_a)
    pdf.table_row(['POST', '/api/client/login', 'Connexion client'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/login', 'Connexion chauffeur (code + mdp)'], cols_a)
    pdf.table_row(['POST', '/api/admin/login', 'Connexion administrateur'], cols_a)
    
    pdf.section_title('Courses', 2)
    pdf.table_row(['Methode', 'Endpoint', 'Description'], cols_a, header=True)
    pdf.table_row(['POST', '/api/course/estimate', 'Estimer le prix d\'une course'], cols_a)
    pdf.table_row(['POST', '/api/course/book', 'Reserver une course'], cols_a)
    pdf.table_row(['GET', '/api/course/{id}', 'Details d\'une course + position chauffeur'], cols_a)
    pdf.table_row(['POST', '/api/course/{id}/cancel', 'Annuler une course'], cols_a)
    pdf.table_row(['POST', '/api/course/{id}/rate', 'Noter une course (1-5 etoiles)'], cols_a)
    
    pdf.section_title('Chauffeur', 2)
    pdf.table_row(['Methode', 'Endpoint', 'Description'], cols_a, header=True)
    pdf.table_row(['GET', '/api/chauffeur/me', 'Profil du chauffeur connecte'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/pointer', 'Demarrer/terminer le service'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/position', 'Mettre a jour la position GPS'], cols_a)
    pdf.table_row(['GET', '/api/chauffeur/pending-course', 'Verifier les courses en attente'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/respond-course/{id}', 'Accepter/refuser une course'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/start-course/{id}', 'Demarrer une course'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/complete-course/{id}', 'Terminer une course'], cols_a)
    pdf.table_row(['GET', '/api/chauffeur/commandes', 'Historique des commandes'], cols_a)
    pdf.table_row(['GET', '/api/chauffeur/revenus', 'Revenus des 30 derniers jours'], cols_a)
    pdf.table_row(['POST', '/api/chauffeur/upload-document', 'Envoyer un document'], cols_a)
    
    pdf.section_title('Chat', 2)
    pdf.table_row(['Methode', 'Endpoint', 'Description'], cols_a, header=True)
    pdf.table_row(['POST', '/api/chat/{course_id}/send', 'Envoyer un message'], cols_a)
    pdf.table_row(['GET', '/api/chat/{course_id}/messages', 'Recuperer les messages'], cols_a)
    pdf.table_row(['GET', '/api/chat/{course_id}/unread', 'Nombre de messages non lus'], cols_a)
    
    pdf.section_title('Administration', 2)
    pdf.table_row(['Methode', 'Endpoint', 'Description'], cols_a, header=True)
    pdf.table_row(['GET', '/api/admin/dashboard', 'Statistiques du tableau de bord'], cols_a)
    pdf.table_row(['GET', '/api/admin/chauffeurs', 'Liste des chauffeurs + revenus'], cols_a)
    pdf.table_row(['POST', '/api/admin/chauffeur', 'Ajouter un chauffeur'], cols_a)
    pdf.table_row(['DELETE', '/api/admin/chauffeur/{id}', 'Supprimer un chauffeur'], cols_a)
    pdf.table_row(['GET', '/api/admin/clients', 'Liste des clients'], cols_a)
    pdf.table_row(['GET', '/api/admin/courses', 'Liste des courses (filtrable)'], cols_a)
    pdf.table_row(['GET', '/api/admin/revenus', 'Revenus par periode'], cols_a)
    pdf.table_row(['POST', '/api/admin/document/{id}/verify', 'Valider/refuser un document'], cols_a)
    
    # ==================== 8. SECURITE ====================
    pdf.add_page()
    pdf.section_title('8. Securite et bonnes pratiques', 1)
    
    pdf.section_title('Authentification', 2)
    pdf.bullet('Mots de passe haches avec bcrypt (salt aleatoire)')
    pdf.bullet('Tokens JWT avec expiration de 7 jours')
    pdf.bullet('Verification du type d\'utilisateur a chaque requete (client/chauffeur/admin)')
    pdf.bullet('Deconnexion automatique en cas de token expire')
    
    pdf.section_title('Autorisation', 2)
    pdf.bullet('Les routes admin sont protegees - seuls les admins y ont acces')
    pdf.bullet('Les chauffeurs ne peuvent acceder qu\'a leurs propres donnees')
    pdf.bullet('Le chat est limite aux participants de la course')
    pdf.bullet('La notation est limitee a une seule note par course et par utilisateur')
    
    pdf.section_title('Donnees', 2)
    pdf.bullet('Les champs _id MongoDB sont exclus de toutes les reponses API')
    pdf.bullet('Les mots de passe ne sont jamais renvoyes dans les reponses')
    pdf.bullet('Les documents uploades sont limites a 5 Mo (JPG, PNG, PDF)')
    pdf.bullet('CORS configure pour autoriser uniquement les origines necessaires')
    
    pdf.ln(10)
    pdf.section_title('Support', 2)
    pdf.body_text('Pour toute question technique ou demande d\'assistance, contactez l\'equipe TaxiG.')
    
    # Save
    output_path = '/app/backend/uploads/TaxiG_Documentation_Complete.pdf'
    pdf.output(output_path)
    print(f'PDF generated: {output_path}')
    return output_path

if __name__ == '__main__':
    generate_doc()
