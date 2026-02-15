# Chain Validation Report (PERO)
Generated: 2026-02-15T05:24:45.075127+00:00

## Summary
- total_chains: 15
- chains_with_issues: 3
- missing_retrieval: 1
- retrieval_before_encoding: 2
- missing_methods: 0

## Details
| chain_id | name | stages | issues |
| --- | --- | --- | --- |
| C-AD-001 | Anatomy Deep Dive | priming -> priming -> encoding -> retrieval -> overlearning | ok |
| C-CI-001 | Clinical Reasoning Intake | priming -> reference -> reference -> retrieval -> overlearning | ok |
| C-CR-001 | Clinical Reasoning | priming -> priming -> retrieval -> reference -> retrieval -> overlearning | ok |
| C-DA-001 | Dense Anatomy Intake | priming -> encoding -> retrieval -> encoding -> overlearning | ok |
| C-DP-001 | DEPTH | priming -> encoding -> encoding -> retrieval -> retrieval -> retrieval -> overlearning | ok |
| C-EP-001 | Exam Prep | priming -> retrieval -> reference -> retrieval -> overlearning | ok |
| C-FE-001 | First Exposure (Core) | priming -> reference -> retrieval -> encoding -> encoding -> overlearning | retrieval_before_encoding |
| C-LE-001 | Low Energy | priming -> reference -> overlearning | missing_retrieval |
| C-MR-001 | Mastery Review | retrieval -> retrieval -> retrieval -> overlearning | ok |
| C-PI-001 | Pathophysiology Intake | priming -> encoding -> priming -> retrieval -> retrieval | ok |
| C-QD-001 | Quick Drill | priming -> retrieval -> overlearning | ok |
| C-QF-001 | Quick First Exposure | priming -> reference -> retrieval -> overlearning | ok |
| C-RS-001 | Review Sprint | priming -> retrieval -> encoding -> overlearning | retrieval_before_encoding |
| C-SW-001 | SWEEP | priming -> reference -> reference -> retrieval -> overlearning | ok |
| C-VE-001 | Visual Encoding | priming -> reference -> reference -> retrieval -> overlearning | ok |
