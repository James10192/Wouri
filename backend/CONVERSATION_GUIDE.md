# Conversation Guide - Clarifications et Memoire

**Stack**: Bun + Hono + TypeScript + Groq + Supabase
**Version**: 1.0
**Derniere mise a jour**: 9 Janvier 2026

---

## 📖 Vue d'Ensemble

Ce document decrit la strategie conversationnelle de Wouri Bot pour obtenir des reponses plus claires :
- Poser des questions de clarification quand des details essentiels manquent.
- Recentrer poliment quand la question est hors sujet.
- Garder en memoire les informations critiques quand l'authentification sera disponible.

---

## ✅ Objectifs

- Eviter les reponses vagues ou imprecises.
- Demander les informations minimales utiles (region, saison, culture, symptomes, etc.).
- Garder un ton naturel, courtois, bref.

---

## 🔎 Quand demander une clarification

Poser une question seulement si un detail essentiel manque pour repondre correctement.

Exemples de details essentiels:
- **Region / zone** (climat, saisons)
- **Culture specifique** (variete, stade)
- **Saison / date** (periode, mois)
- **Symptomes precis** (maladie, ravageur)
- **Type de sol / irrigation** (si utile)

### Exemple

Question: "Quand planter du mais ?"

Reponse attendue:
"Pour te repondre precisement, tu es dans quelle region (ex: Abidjan, Bouake, Korhogo) ?"

---

## 🧠 Memoire des informations critiques (futur)

Quand l'authentification sera ajoutee, stocker ces informations:
- Region principale de l'utilisateur
- Cultures principales
- Langue preferee
- Contraintes (irrigation, type de sol)

Cela permettra:
- Moins de questions repetitives
- Conseils plus personnalises

---

## ✳️ Redirection hors sujet

Si la question est hors agriculture, repondre naturellement et recentrer:

Exemple:
"Je comprends ta question. Je peux surtout aider sur l'agriculture en Cote d'Ivoire. Dis-moi ce que tu cultives ou ta region."

---

## 🔄 Changelog

### 9 Janvier 2026 - v1.0
- Creation du guide clarifications et memoire

---

*Derniere mise a jour: 9 Janvier 2026*
