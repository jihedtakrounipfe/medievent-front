# 🎯 Implémentation des 8 Fonctionnalités Sophistiquées de Commentaires

## Vue d'ensemble

Un système de commentaires entiè rement refondu avec 8 fonctionnalités avancées : arborescence, ranking intelligent, notifications, marques utilité, auteur mis en évidence, réputation, historique, épinglage.

---

## 1️⃣ 💬 Commentaires en Arborescence

**Objectif**: Permettre les réponses imbriquées (répondre à un commentaire spécifique).

### Modèle
```typescript
export interface ForumComment {
  replyToId?: string;          // Référence au commentaire parent
  replies?: ForumComment[];    // Array de réponses imbriquées
  // ...
}
```

### Service
```typescript
// Récupère commentaires organisés en arborescence
getThreadedComments(postId: string, opId?: number): Observable<ForumComment[]>

// Construit la structure arborescente
private buildCommentTree(comments: ForumComment[]): ForumComment[]
```

### Composant
`ForumCommentThreadComponent` - Composant **récursif** affichant:
- Commentaire principal avec indentation
- Liste des réponses collapse/expand
- Appelé récursivement pour chaque réponse (imbrication illimitée)

### UI
```
Commentaire principal
  └─ Réponse 1
     └─ Réponse à la réponse 1
  └─ Réponse 2
```

---

## 2️⃣ ⭐ Système de Score Intelligent

**Objectif**: Ranking sophistiqué par algorithme multi-critères.

### Algorithme (`calculateCommentScore()`)

```
Score = (upvotes × 1.5) + bonus_rôle + bonus_accepté + bonus_utilité + malus_irrélevant + bonus_récence + bonus_réputation_auteur
```

**Composantes:**
- **Upvotes**: ×1.5 chacun (base)
- **Rôle Médecin**: +3 points (expertise)
- **Accepté comme réponse**: +5 points
- **Marqué Solution**: +5  points
- **Marqué Utile**: +2 points
- **Marqué Irrélevant**: -3 points
- **Récence**: +2 pts, -2 pts/semaine (plus récent = bonus)
- **Réputation auteur**: ×0.1 du score de réputation

### Service
```typescript
calculateCommentScore(comment: ForumComment): number
rankComments(comments: ForumComment[]): ForumComment[]  // Tri par score
```

### Mode Affichage
- 🔀 Tri par **Pertinence** (par défaut) → Score intelligent
- 🧵 Tri par **Arborescence** → Structure parent-réponses
- 🕐 Tri par **Récent** → Ordre chronologique

---

## 3️⃣ 🔔 Notifications Intelligentes

**Objectif**: Alerter l'utilisateur quand son commentaire est répondu ou marqué utile.

### Service
```typescript
notifyCommentReply(commentId: string, replyContent: string, replierName: string)
notifyCommentMarked(commentId: string, markType: 'helpful' | 'solution', markerName: string)
```

### Intégration
- Appelée lors de `add()` réponse imbriquée
- Appelée lors de `markCommentUtility()` 
- Utilise `ForumNotificationService`

### Notifications
- 💬 "Jean a répondu à votre commentaire"
- ✅ "Marie a marqué votre commentaire comme solution"
- 👍 "Pierre a marqué votre commentaire comme utile"

---

## 4️⃣ ✅ Marques Utilité/Fiabilité

**Objectif**: La communauté marque les commentaires utiles/solutions/irrélevants.

### Modèle
```typescript
export interface CommentUtility {
  helpful: boolean;
  isSolution: boolean;
  isIrrelevant: boolean;
  userUtilityVotes?: Map<string, 'helpful' | 'solution' | 'irrelevant'>;
}

// Dans ForumComment:
utility?: CommentUtility;
```

### Service
```typescript
markCommentUtility(
  postId: string,
  commentId: string,
  utilityType: 'helpful' | 'solution' | 'irrelevant',
  userId: string
): Observable<ForumComment>
```

### Impact Réputation
- **Solution**: +10 points
- **Utile**: +3 points
- **Irrélevant**: -2 points

### UI
```
👍 Utile (12)      ✅ Solution (5)      ❌ Impact (non-pertinent)
```

---

## 5️⃣ 👨‍⚕️ Réponses de l'Auteur Mises en Évidence

**Objectif**: Distinguer visuellement l'auteur original du post et les médecins.

### Flags
```typescript
// Dans ForumComment:
isAuthorOp?: boolean;      // Auteur du post original
author.role === 'DOCTOR';  // Role médecin
```

### Appliqué en
```typescript
markAuthorComments(comments: ForumComment[], authorId?: number): ForumComment[]
// Appelée lors enrichissement
```

### Styles
- **Auteur OP**: Bordure gauche bleue + badge "🔵 A.O"
- **Médecin**: Bordure verte + badge "👨‍⚕️ Médecin"
- **Avatar distinct**: Couleurs différentes

---

## 6️⃣ 🏆 Réputation Utilisateur

**Objectif**: Système de scoring pour valoriser contributeurs fiables.

### Modèle
```typescript
export interface CommentUserReputation {
  userId: number;
  totalScore: number;
  helpfulCount: number;
  solutionCount: number;
  level: 'novice' | 'contributor' | 'expert' | 'trusted';
}
```

### Niveaux
- **0-19**: Novice (pas de badge)
- **20-49**: Contributeur (vert/🟢)
- **50-99**: Expert (violet/🟣)
- **100+**: De confiance (rose/💕)

### Points Acquis
- **+1**: Chaque upvote reçu
- **+5**: Commentaire accepté comme réponse
- **+10**: Marqué comme solution
- **+3**: Marqué comme utile
- **-2**: Marqué comme irrélevant

### Service
```typescript
getUserReputation(userId: number): CommentUserReputation
addReputationScore(userId: number, points: number): void
```

### Stockage Persistant
localStorage: `user_reputations`

---

## 7️⃣ 📝 Historique des Modifications

**Objectif**: Voir quand et comment un commentaire a été modifié.

### Modèle
```typescript
export interface CommentEditHistory {
  editedAt: Date;
  editedBy: string;
  previousContent: string;
  reason?: string;
}

// Dans ForumComment:
editHistory?: CommentEditHistory[];
```

### Service
```typescript
// Populate lors update:
comment.editHistory.push({
  editedAt: new Date(),
  editedBy: 'username',
  previousContent: oldContent,
  reason: optional
})
```

### UI
- Button "📝 Voir l'historique" au-dessous du commentaire
- Liste des modifications avec dates/auteurs

---

## 8️⃣ 🎯 Épinglage Local

**Objectif**: Marquer les meilleurs commentaires par post.

### Service
```typescript
pinComment(postId: string, commentId: string): void
unpinComment(postId: string, commentId: string): void
isCommentPinned(postId: string, commentId: string): boolean
getPinnedComments(comments: ForumComment[], postId: string): ForumComment[]
```

### Stockage
- localStorage: `pinned_comments`
- Map: postId → Set<commentId>

### Impact Ranking
- Commentaires épinglés remontent en priorité
- Badge 📌 visible
- Distinction visuelle (fond orange clair)

### Limite
- À implémenter: Max 5 pins par post

---

## Architecture

### Hiérarchie Composants
```
ForumDetailComponent
├─ Forum Comments Section (HTML partielle)
│  ├─ Contrôles tri (ranking/threaded/recent)
│  ├─ Input réponse
│  └─ Comments Container
│     └─ ForumCommentThreadComponent (récursif)
│        ├─ Avatar + auteur + badges
│        ├─ Score badge
│        ├─ Contenu + historique
│        ├─ Marques utilité
│        ├─ Actions (upvote, reply, pin, edit, delete)
│        └─ Réponses imbriquées (ForumCommentThreadComponent)
```

### Flux de Données
```
ForumDetailComponent.loadComments()
  → commentService.getThreadedComments()
    → commentService.enrichComments() [reputation, score, isPinned, isAuthorOp]
    → buildCommentTree() [arborescence]
  → commentService.rankComments() [tri par score]
  → Stockage: threadedComments, rankedComments
  
submitComment()
  → add() avec replyToId
  → addReplyToComment() [imbrication]
  → notifyCommentReply() [notification parent]
  → rankComments() [recalc]
  
markCommentUtility()
  → service.markCommentUtility()
  → addReputationScore() [+impact]
  → notifyCommentMarked() [notification]
```

---

## Stockage Persistant

localStorage keys:
- `user_votes` - Votes utilisateur (voting déduplication)
- `comment_utilities` - Marques utilité (helpful/solution/irrelevant)
- `pinned_comments` - Commentaires épinglés
- `user_reputations` - Scores de réputation

---

## API Backend Attendue

POST `/api/forum/posts/{postId}/comments`
```json
{
  "content": "...",
  "replyToId": "uuid" // optionnel
}
```

PATCH `/api/forum/posts/{postId}/comments/{commentId}/utility`
```json
{
  "utilityType": "helpful" | "solution" | "irrelevant",
  "userId": "string"
}
```

GET `/api/forum/posts/{postId}/comments/{commentId}/history`
Response: `CommentEditHistory[]`

---

## Validation & Tests

### Cas de Test Princ ipaux
1. ✅ Créer commentaire imbriqué (replyToId transmis)
2. ✅ Voir arborescence avec collapse/expand
3. ✅ Score recalculé après upvote/utility mark
4. ✅ Notification reçue réponse/marking
5. ✅ Réputation augmente
6. ✅ Historique affiché
7. ✅ Pin/unpin toggle
8. ✅ Badges affichés correctement

---

## Performance

- **Lazy Loading**: 20 commentaires par page
- **Rendering**: ChangeDetectionStrategy.OnPush (optimisé)
- **Récursion Limite**: Arborescence illimitée (à considérer max 5 niveaux)
- **LocalStorage**: ~50KB max par post

---

## Améliorations Futures

1. Pagination backend pour lazy loading
2. Filters avancés (par auteur, par rôle, par date)
3. Modération (flag irrélevant → caché)
4. Thread notification avec badges
5. AI-powered spam detection
6. Real-time updates via WebSocket
