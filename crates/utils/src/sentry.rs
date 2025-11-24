use std::sync::OnceLock;

use sentry_tracing::{EventFilter, SentryLayer};
use tracing::Level;

const SENTRY_DSN: &str = "https://1065a1d276a581316999a07d5dffee26@o4509603705192449.ingest.de.sentry.io/4509605576441937";

static INIT_GUARD: OnceLock<sentry::ClientInitGuard> = OnceLock::new();

#[derive(Clone, Copy, Debug)]
pub enum SentrySource {
    Backend,
    Mcp,
}

impl SentrySource {
    fn tag(self) -> &'static str {
        match self {
            SentrySource::Backend => "backend",
            SentrySource::Mcp => "mcp",
        }
    }
}

fn environment() -> &'static str {
    if cfg!(debug_assertions) {
        "dev"
    } else {
        "production"
    }
}

fn sentry_enabled() -> bool {
    // 기본: 로컬(dev)에서는 끔. ENABLE_SENTRY_IN_DEV 있으면 켬. DISABLE_SENTRY 있으면 무조건 끔.
    if std::env::var("DISABLE_SENTRY").is_ok() {
        return false;
    }
    if cfg!(debug_assertions) && std::env::var("ENABLE_SENTRY_IN_DEV").is_err() {
        return false;
    }
    true
}

fn sentry_dsn() -> Option<String> {
    if let Ok(dsn) = std::env::var("SENTRY_DSN") {
        if !dsn.is_empty() {
            return Some(dsn);
        }
    }
    if sentry_enabled() {
        Some(SENTRY_DSN.to_string())
    } else {
        None
    }
}

pub fn init_once(source: SentrySource) {
    let Some(dsn) = sentry_dsn() else {
        return;
    };

    INIT_GUARD.get_or_init(|| {
        sentry::init(sentry::ClientOptions {
            dsn: Some(
                dsn.parse()
                    .expect("SENTRY_DSN must be a valid DSN or unset to disable sentry"),
            ),
            release: sentry::release_name!(),
            environment: Some(environment().into()),
            ..Default::default()
        })
    });

    sentry::configure_scope(|scope| {
        scope.set_tag("source", source.tag());
    });
}

pub fn configure_user_scope(user_id: &str, username: Option<&str>, email: Option<&str>) {
    let mut sentry_user = sentry::User {
        id: Some(user_id.to_string()),
        ..Default::default()
    };

    if let Some(username) = username {
        sentry_user.username = Some(username.to_string());
    }

    if let Some(email) = email {
        sentry_user.email = Some(email.to_string());
    }

    sentry::configure_scope(|scope| {
        scope.set_user(Some(sentry_user));
    });
}

pub fn sentry_layer<S>() -> SentryLayer<S>
where
    S: tracing::Subscriber,
    S: for<'a> tracing_subscriber::registry::LookupSpan<'a>,
{
    SentryLayer::default()
        .span_filter(|meta| {
            matches!(
                *meta.level(),
                Level::DEBUG | Level::INFO | Level::WARN | Level::ERROR
            )
        })
        .event_filter(|meta| match *meta.level() {
            Level::ERROR => EventFilter::Event,
            Level::DEBUG | Level::INFO | Level::WARN => EventFilter::Breadcrumb,
            Level::TRACE => EventFilter::Ignore,
        })
}
