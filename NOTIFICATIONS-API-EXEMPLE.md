# 🔔 API Notifications - Structure Backend

## Endpoints requis

### 1. GET `/api/notifications`
Récupère toutes les notifications pour l'utilisateur connecté

**Réponse attendue :**
```json
[
  {
    "id": 1,
    "titre": "Nouveau événement ajouté",
    "message": "Un événement 'Tournoi de Noël' a été créé pour le 15/12/2025",
    "type": "evenement", 
    "lu": false,
    "date": "2025-10-01T14:30:00Z",
    "utilisateurId": 123
  },
  {
    "id": 2,
    "titre": "Cours modifié",
    "message": "Le cours du mardi 18h a été déplacé à 19h",
    "type": "cours",
    "lu": true,
    "date": "2025-09-30T10:15:00Z",
    "utilisateurId": 123
  }
]
```

### 2. PUT `/api/notifications/{id}/read`
Marque une notification comme lue

**Requête :** `PUT /api/notifications/1/read`
**Réponse :** `200 OK`

### 3. PUT `/api/notifications/mark-all-read`
Marque toutes les notifications comme lues

**Requête :** `PUT /api/notifications/mark-all-read`
**Réponse :** `200 OK`

## Types de notifications supportés

| Type | Icône | Description |
|------|-------|-------------|
| `evenement` | 📅 `ri-calendar-line` | Événements créés/modifiés |
| `cours` | 📅 `ri-calendar-line` | Cours ajoutés/modifiés |
| `paiement` | 💰 `ri-money-euro-circle-line` | Confirmations de paiement |
| `examen` | 🏅 `ri-medal-line` | Résultats d'examens |
| `inscription` | 👤 `ri-user-add-line` | Nouvelles inscriptions |
| `general` | 🔔 `ri-notification-line` | Notifications générales |

## Exemple d'intégration dans votre backend

### Quand un admin ajoute un événement :
```java
// EventController.java
@PostMapping("/evenements")
public ResponseEntity<Event> createEvent(@RequestBody Event event) {
    Event savedEvent = eventService.save(event);
    
    // Créer notification pour tous les membres
    notificationService.createNotificationForAllMembers(
        "Nouveau événement ajouté",
        "L'événement '" + event.getNom() + "' a été créé pour le " + event.getDate(),
        "evenement"
    );
    
    return ResponseEntity.ok(savedEvent);
}
```

### Service de notification :
```java
@Service
public class NotificationService {
    
    public void createNotificationForAllMembers(String titre, String message, String type) {
        List<Utilisateur> membres = utilisateurService.findAll();
        
        for (Utilisateur membre : membres) {
            Notification notification = new Notification();
            notification.setTitre(titre);
            notification.setMessage(message);
            notification.setType(type);
            notification.setLu(false);
            notification.setDate(new Date());
            notification.setUtilisateurId(membre.getId());
            
            notificationRepository.save(notification);
        }
    }
}
```

## Test du système

1. **Sans backend** : L'icône 🔔 apparaît mais sans notifications
2. **Avec backend** : Les notifications apparaissent en temps réel
3. **Après ajout d'événement** : Nouvelle notification visible immédiatement

## Logs de débogage

Le frontend affiche des logs dans la console :
- ✅ `Notifications reçues: [...]` si succès
- ❌ `Erreur lors du chargement des notifications` si échec