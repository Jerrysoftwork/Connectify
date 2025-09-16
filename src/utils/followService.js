import { supabase } from "../supabaseClient";

// ✅ Follow a user
export const followUser = async (followerId, followingId) => {
  const { error } = await supabase.from("follows").insert([
    {
      follower_id: followerId,
      following_id: followingId,
    },
  ]);
  return error;
};

// ✅ Unfollow a user
export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return error;
};

// ✅ Check if following
export const isFollowing = async (followerId, followingId) => {
  const { data, error } = await supabase
    .from("follows")
    .select("*")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();
  return { isFollowing: !!data, error };
};
