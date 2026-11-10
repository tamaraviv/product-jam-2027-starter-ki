import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import styles from "./HomePage.module.css";

type Me = { id: string; email: string };

/**
 * The home page. Replace all of this with your own app.
 *
 * Once you are logged in, it shows the two halves of the system talking to
 * each other: the browser knows who you are from Supabase, and /api/me
 * proves the SERVER agrees - it checked your token before answering.
 */
export default function HomePage() {
  const { user } = useAuth();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/me"),
    // Only ask once we know somebody is logged in.
    enabled: Boolean(user),
  });

  return (
    <main>
      <h2>Welcome to the Product Jam Starter Kit</h2>
      <p>
        Feel free to look around, edit the source code and navigate to the
        demos. This page is client/pages/home/HomePage.tsx.
      </p>

      <div className={styles.logos}>
        <img src="/huji.svg" alt="HUJI Logo" width="80" height="80" />
        <img src="/bezalel.svg" alt="Bezalel Logo" width="80" height="80" />
      </div>

      {user ? (
        <>
          <p>
            The server knows you as:{" "}
            <strong>
              {meQuery.isPending
                ? "Checking..."
                : meQuery.isError
                  ? "Error"
                  : meQuery.data.email}
            </strong>
          </p>
          <p>
            <Link to="/events">My events</Link>
          </p>
        </>
      ) : null}

      <h2>What You Can Find Here</h2>
      <p>
        This site is our Product Jam playground: a collection of small projects
        built on a React client, a Hono server running on Cloudflare Workers,
        and Supabase for login and data. Each project explores a different idea,
        from a classic game to live space pictures to a product design for
        caring for street cats. Log in to save your games and manage your own
        events.
      </p>
      <ul>
        <li>
          <Link to="/tic-tac-toe">Tic-Tac-Toe</Link> - play a game and keep a
          history of your saved games.
        </li>
        <li>
          <Link to="/nasa">NASA Space Pictures</Link> - browse NASA&apos;s
          pictures of space, with Hebrew translations.
        </li>
        <li>
          <Link to="/cat-ch">Design</Link> - a design concept for meeting the
          neighborhood cats and taking care of their needs.
        </li>
        <li>
          <Link to="/demos">Demos</Link> - examples of the building blocks:
          page elements, charts and shared components.
        </li>
      </ul>
    </main>
  );
}
