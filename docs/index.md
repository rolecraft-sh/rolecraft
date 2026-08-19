---
layout: home

hero:
  name: "RoleCraft"
  text: "The Security-First Skill Manager for AI Agents"
  tagline: Every install runs a security scan · Skills & MCP Servers across 86 Agents (26 Verified)
  image:
    src: /rolecraft-demo.gif
    alt: RoleCraft Demo
  actions:
    - theme: brand
      text: Onboarding Guide
      link: /guides/onboarding
    - theme: alt
      text: Install Guide
      link: /install
    - theme: alt
      text: View on GitHub
      link: https://github.com/rolecraft-sh/rolecraft

features:
  - title: One-Command Onboarding
    details: "rolecraft setup <source> detects all AI agents and installs skills + MCP servers to every one of them."
  - title: Zero Dependencies
    details: 432.8 kB, no bloat. Only Node.js built-ins.
  - title: MCP + Skills in One Command
    details: Install skills and their MCP servers together. No other CLI tool combines both.
  - title: Rollback
    details: Revert any skill or MCP change instantly with a single command. --list shows every snapshot.
  - title: Security Scoring
    details: Static analysis on install — detects prompt injection, command injection, obfuscated code.
  - title: CI-Ready
    details: Lockfile-based re-install for pipelines.
  - title: Init Templates
    details: "rolecraft init --template scaffolds production-ready skills from pre-built templates. Start fast, ship faster."
  - title: Parallel Install
    details: Install skills and MCP servers across all 86 agents (26 verified) simultaneously. Blazing fast, built for scale.
