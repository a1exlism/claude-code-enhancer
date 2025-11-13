# Configuration Examples

This document provides practical configuration examples for different use cases.

## Table of Contents

- [Minimal Configuration](#minimal-configuration)
- [Development Configuration](#development-configuration)
- [Production Configuration](#production-configuration)
- [Hook-Specific Configuration](#hook-specific-configuration)
- [Notification Configuration](#notification-configuration)
- [Quality Check Configuration](#quality-check-configuration)
- [Environment-Specific Configuration](#environment-specific-configuration)

---

## Minimal Configuration

The simplest configuration with defaults:

```json
{
  "quality": {
    "enabled": true,
    "linters": ["tsc"],
    "autoFix": false
  }
}
```

---

## Development Configuration

Optimized for development with verbose logging and auto-fix:

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 10,
      "matcher": ".*"
    },
    "PostToolUse": {
      "enabled": true,
      "timeout": 10
    },
    "SessionStart": {
      "enabled": true,
      "timeout": 5
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": true
  },
  "notify": {
    "channels": {
      "telegram": {
        "enabled": false
      }
    }
  }
}
```

---

## Production Configuration

Optimized for production with strict validation and notifications:

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "matcher": "Write|Edit|Delete",
      "options": {
        "strictMode": true,
        "validateSecurity": true
      }
    },
    "PostToolUse": {
      "enabled": true,
      "timeout": 3,
      "options": {
        "runTests": true,
        "validateOutput": true
      }
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  },
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      },
      "discord": {
        "enabled": true,
        "webhookUrl": "${DISCORD_WEBHOOK_URL}"
      }
    },
    "filters": {
      "rules": ["error", "warning"],
      "aiEnabled": true
    }
  }
}
```

---

## Hook-Specific Configuration

### Security-Focused Configuration

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "matcher": "Write|Edit|Delete|Bash",
      "options": {
        "securityCheck": true,
        "dangerousCommands": ["rm -rf", "sudo", "chmod 777"],
        "allowedPaths": ["/home/user/projects"],
        "denyPaths": ["/etc", "/sys", "/proc"]
      }
    }
  }
}
```

### Performance Monitoring Configuration

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "options": {
        "trackPerformance": true,
        "logSlowOperations": true,
        "slowThreshold": 1000
      }
    },
    "PostToolUse": {
      "enabled": true,
      "timeout": 5,
      "options": {
        "measureExecutionTime": true,
        "reportMetrics": true
      }
    }
  }
}
```

### Code Quality Configuration

```json
{
  "hooks": {
    "PostToolUse": {
      "enabled": true,
      "timeout": 10,
      "matcher": "Write|Edit",
      "options": {
        "runLinters": true,
        "runTests": true,
        "checkCoverage": true,
        "minCoverage": 80
      }
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint", "prettier"],
    "autoFix": true
  }
}
```

---

## Notification Configuration

### Telegram Only

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    },
    "filters": {
      "rules": ["error", "warning", "info"],
      "aiEnabled": false
    }
  }
}
```

### Multi-Channel Notifications

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      },
      "discord": {
        "enabled": true,
        "webhookUrl": "${DISCORD_WEBHOOK_URL}"
      },
      "email": {
        "enabled": true,
        "smtp": {
          "host": "${SMTP_HOST}",
          "port": 587,
          "user": "${SMTP_USER}",
          "pass": "${SMTP_PASS}"
        },
        "from": "${EMAIL_FROM}",
        "to": ["${EMAIL_TO}"]
      }
    },
    "filters": {
      "rules": ["error"],
      "aiEnabled": true
    }
  }
}
```

### Smart Filtering with AI

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    },
    "filters": {
      "rules": [
        "severity:error",
        "severity:warning AND source:security",
        "type:test-failure"
      ],
      "aiEnabled": true
    }
  }
}
```

---

## Quality Check Configuration

### TypeScript Only

```json
{
  "quality": {
    "enabled": true,
    "linters": ["tsc"],
    "autoFix": false
  }
}
```

### Full Stack (TypeScript + ESLint + Prettier)

```json
{
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint", "prettier"],
    "autoFix": true
  }
}
```

### Custom Linter Configuration

```json
{
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  },
  "hooks": {
    "PostToolUse": {
      "enabled": true,
      "timeout": 10,
      "matcher": "Write|Edit",
      "options": {
        "linterConfig": {
          "tsc": {
            "strict": true,
            "noImplicitAny": true
          },
          "eslint": {
            "fix": true,
            "maxWarnings": 0
          }
        }
      }
    }
  }
}
```

---

## Environment-Specific Configuration

### Using Environment Variables

**.claude-enhancer.json**:
```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5
    }
  },
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  }
}
```

**.env**:
```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Quality Configuration (override)
CLAUDE_ENHANCER_QUALITY_ENABLED=true
CLAUDE_ENHANCER_QUALITY_AUTO_FIX=false
```

### Development vs Production

**Development** (`.claude-enhancer.json`):
```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 10
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc"],
    "autoFix": true
  },
  "notify": {
    "channels": {
      "telegram": {
        "enabled": false
      }
    }
  }
}
```

**Production** (`~/.claude-enhancer/config.json`):
```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "matcher": "Write|Edit|Delete"
    },
    "PostToolUse": {
      "enabled": true,
      "timeout": 3
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  },
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    },
    "filters": {
      "rules": ["error"],
      "aiEnabled": true
    }
  }
}
```

---

## Configuration Validation

All configurations are validated using Zod schemas. Common validation errors:

### Invalid Timeout

```json
{
  "hooks": {
    "PreToolUse": {
      "timeout": 0  // ❌ Error: Too small, minimum is 1
    }
  }
}
```

**Fix**:
```json
{
  "hooks": {
    "PreToolUse": {
      "timeout": 1  // ✅ Valid
    }
  }
}
```

### Invalid Email Format

```json
{
  "notify": {
    "channels": {
      "email": {
        "from": "invalid-email"  // ❌ Error: Invalid email
      }
    }
  }
}
```

**Fix**:
```json
{
  "notify": {
    "channels": {
      "email": {
        "from": "user@example.com"  // ✅ Valid
      }
    }
  }
}
```

### Missing Required Fields

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true
        // ❌ Error: Missing botToken and chatId
      }
    }
  }
}
```

**Fix**:
```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",  // ✅ Required
        "chatId": "${TELEGRAM_CHAT_ID}"       // ✅ Required
      }
    }
  }
}
```

---

## Tips and Best Practices

### 1. Use Environment Variables for Secrets

Never commit secrets to version control:

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "botToken": "${TELEGRAM_BOT_TOKEN}",  // ✅ Good
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    }
  }
}
```

### 2. Start with Minimal Configuration

Begin with a simple config and add features as needed:

```json
{
  "quality": {
    "enabled": true,
    "linters": ["tsc"],
    "autoFix": false
  }
}
```

### 3. Use Project-Level Config for Team Settings

Commit `.claude-enhancer.json` to share team settings:

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "matcher": "Write|Edit"
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  }
}
```

### 4. Use User-Level Config for Personal Preferences

Keep personal settings in `~/.claude-enhancer/config.json`:

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    }
  }
}
```

### 5. Override with Environment Variables

Use environment variables for temporary overrides:

```bash
# Disable quality checks temporarily
export CLAUDE_ENHANCER_QUALITY_ENABLED=false

# Enable auto-fix for this session
export CLAUDE_ENHANCER_QUALITY_AUTO_FIX=true
```

---

## Related Documentation

- [Getting Started Guide](../guides/getting-started.md)
- [Hook Examples](./hook-examples.md)
- [API Reference](../api/README.md)
