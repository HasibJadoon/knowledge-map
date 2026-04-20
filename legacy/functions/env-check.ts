interface Env {
  CLAUDE_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    env_loaded: true,
    claude_key_present: Boolean(env.CLAUDE_API_KEY),
  });
};
