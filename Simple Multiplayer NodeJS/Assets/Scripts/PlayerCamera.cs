using UnityEngine;

public class PlayerCamera : MonoBehaviour
{
    public Transform target; // Player's transform to follow

    // Update is called once per frame
    void Update()
    {
        if (target != null)
        {
            // Update camera position to follow the player
            transform.position = new Vector3(target.position.x, target.position.y + 2.0f, target.position.z - 5.0f);
            transform.LookAt(target.position); // Look at the player
        }
    }
}
